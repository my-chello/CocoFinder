import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { MessagesProvider } from './src/context/MessagesContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { palette } from './src/config/theme';
import {
  AppRole,
  AppViewMode,
  clearAuthSession,
  clearSelectedRole,
  createAuthSession,
  getAuthSession,
  getSelectedRole,
  setAuthViewMode,
  setSelectedRole,
} from './src/lib/auth';
import { env } from './src/config/env';
import { AdminModeScreen } from './src/screens/auth/AdminModeScreen';
import { completeOnboarding, hasCompletedOnboarding } from './src/lib/onboarding';
import { EmailAuthScreen } from './src/screens/auth/EmailAuthScreen';
import { RoleSelectionScreen } from './src/screens/auth/RoleSelectionScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { supabase } from './src/lib/supabase';
import {
  getSupabaseAppRole,
  resetPasswordForEmail,
  signInWithEmail,
  signUpWithEmail,
  syncSupabaseRole,
} from './src/lib/supabaseAuth';
import {
  clearVendorLocalCache,
  ensureVendorCacheForUser,
  hasVendorProfile,
  saveVendorProfile,
  VendorProfileSetup,
} from './src/lib/vendorProfile';
import {
  clearCustomerLocalCache,
  ensureCustomerCacheForUser,
  hasCustomerProfile,
  saveCustomerProfile,
  type CustomerProfileSetup,
} from './src/lib/customerProfile';
import { CustomerSetupScreen } from './src/screens/auth/CustomerSetupScreen';
import { VendorSetupScreen } from './src/screens/vendor/VendorSetupScreen';
import { registerDevicePushToken, unregisterDevicePushToken } from './src/lib/pushNotifications';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [selectedRole, setSelectedRoleState] = useState<AppRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<AppRole | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<AppViewMode>('customer');
  const [hasCompletedVendorSetup, setHasCompletedVendorSetup] = useState<boolean | null>(null);
  const [hasCompletedCustomerSetup, setHasCompletedCustomerSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBootstrapState() {
      try {
        const [isComplete, storedRole, authSession, supabaseSessionResult] = await Promise.all([
          hasCompletedOnboarding(),
          getSelectedRole(),
          getAuthSession(),
          supabase.auth.getSession(),
        ]);
        const supabaseSession = supabaseSessionResult.data.session;
        await ensureVendorCacheForUser(supabaseSession?.user?.id ?? null);
        await ensureCustomerCacheForUser(supabaseSession?.user?.id ?? null);
        const vendorProfileExists = await hasVendorProfile();
        const customerProfileExists = await hasCustomerProfile();
        const isAdminSession = authSession?.role === 'admin';
        const roleFromSupabase = supabaseSession ? await getSupabaseAppRole() : null;
        const resolvedUserRole =
          roleFromSupabase ??
          (storedRole === 'vendor' || storedRole === 'customer' ? storedRole : null);

        if (!isMounted) {
          return;
        }

        if (roleFromSupabase && roleFromSupabase !== storedRole) {
          await setSelectedRole(roleFromSupabase);
        }

        setShouldShowOnboarding(!isComplete);
        setSelectedRoleState(isAdminSession ? storedRole : resolvedUserRole);
        setIsAuthenticated(isAdminSession ? true : Boolean(resolvedUserRole && supabaseSession));
        setAuthRole(isAdminSession ? 'admin' : resolvedUserRole && supabaseSession ? resolvedUserRole : null);
        setActiveViewMode(
          isAdminSession ? authSession?.viewMode ?? 'admin' : resolvedUserRole ?? 'customer'
        );
        setHasCompletedVendorSetup(vendorProfileExists);
        setHasCompletedCustomerSetup(customerProfileExists);
      } catch {
        if (!isMounted) {
          return;
        }

        setShouldShowOnboarding(true);
        setSelectedRoleState(null);
        setIsAuthenticated(false);
        setAuthRole(null);
        setActiveViewMode('customer');
        setHasCompletedVendorSetup(false);
        setHasCompletedCustomerSetup(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBootstrapState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadBootstrapState();
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        return;
      }

      supabase.auth.stopAutoRefresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !(authRole === 'vendor' || authRole === 'customer')) {
      return;
    }

    void registerDevicePushToken();
  }, [authRole, isAuthenticated]);

  async function handleCompleteOnboarding() {
    await completeOnboarding();
    setShouldShowOnboarding(false);
  }

  async function handleSelectRole(role: AppRole) {
    await setSelectedRole(role);
    setSelectedRoleState(role);
    if (role === 'admin') {
      await createAuthSession({
        role: 'admin',
        provider: 'email',
        viewMode: 'admin',
      });
      setAuthRole('admin');
      setActiveViewMode('admin');
      setIsAuthenticated(true);
      return;
    }
  }

  async function handleBackToRoleSelection() {
    await clearSelectedRole();
    setSelectedRoleState(null);
  }

  async function completeAuthenticatedRoleFlow(
    role: Extract<AppRole, 'vendor' | 'customer'>
  ) {
    if (role === 'customer') {
      setHasCompletedCustomerSetup(null);
    }
    if (role === 'vendor') {
      setHasCompletedVendorSetup(null);
    }
    await syncSupabaseRole(role);
    await createAuthSession({
      role,
      provider: 'email',
      viewMode: role,
    });
    setAuthRole(role);
    setActiveViewMode(role);
    setIsAuthenticated(true);
  }

  async function handleSignOut() {
    if (authRole === 'vendor' || authRole === 'customer') {
      await unregisterDevicePushToken();
      await supabase.auth.signOut();
    }
    await clearCustomerLocalCache();
    await clearVendorLocalCache();
    await clearAuthSession();
    await clearSelectedRole();
    setSelectedRoleState(null);
    setAuthRole(null);
    setActiveViewMode('customer');
    setIsAuthenticated(false);
    setHasCompletedCustomerSetup(false);
  }

  async function handleBackFromCustomerSetup() {
    if (authRole === 'customer') {
      await unregisterDevicePushToken();
      await supabase.auth.signOut();
    }

    await clearCustomerLocalCache();
    await clearAuthSession();
    setAuthRole(null);
    setActiveViewMode('customer');
    setIsAuthenticated(false);
    setHasCompletedCustomerSetup(false);
  }

  async function handleBackFromVendorSetup() {
    if (authRole === 'vendor') {
      await unregisterDevicePushToken();
      await supabase.auth.signOut();
    }

    await clearAuthSession();
    setAuthRole(null);
    setActiveViewMode('customer');
    setIsAuthenticated(false);
    setHasCompletedVendorSetup(false);
  }

  async function handleCompleteCustomerSetup(profile: CustomerProfileSetup) {
    try {
      await saveCustomerProfile(profile);
      setHasCompletedCustomerSetup(true);
    } catch (error) {
      Alert.alert(
        'Customer setup failed',
        error instanceof Error
          ? error.message
          : 'Could not save your customer profile right now.'
      );
    }
  }

  async function handleAdminViewModeChange(nextViewMode: AppViewMode) {
    await setAuthViewMode(nextViewMode);
    setActiveViewMode(nextViewMode);
  }

  async function handleCompleteVendorSetup(profile: VendorProfileSetup) {
    try {
      await saveVendorProfile(profile);
      setHasCompletedVendorSetup(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your vendor profile to the database.';
      Alert.alert(
        'Vendor setup failed',
        message
      );
      throw new Error(message);
    }
  }

  async function handleEmailLogin(email: string, password: string) {
    if (!selectedRole || selectedRole === 'admin') {
      return;
    }

    if (!env.hasSupabase) {
      Alert.alert(
        'Supabase config missing',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before using real sign in.'
      );
      return;
    }

    await signInWithEmail(email, password);
    await completeAuthenticatedRoleFlow(selectedRole);
  }

  async function handleEmailSignUp(email: string, password: string) {
    if (!selectedRole || selectedRole === 'admin') {
      return 'verification_required' as const;
    }

    if (!env.hasSupabase) {
      Alert.alert(
        'Supabase config missing',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before using real sign in.'
      );
      return 'verification_required' as const;
    }

    const result = await signUpWithEmail(email, password, selectedRole);

    if (result.session) {
      await completeAuthenticatedRoleFlow(selectedRole);
      return 'authenticated' as const;
    }

    return 'verification_required' as const;
  }

  async function handleForgotPassword(email: string) {
    if (!env.hasSupabase) {
      Alert.alert(
        'Supabase config missing',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before using password reset.'
      );
      return;
    }

    await resetPasswordForEmail(email);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider value={{ authRole, activeViewMode, signOut: handleSignOut }}>
          <FavoritesProvider>
            <MessagesProvider>
              <StatusBar style="light" />
              {isLoading ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.ink,
                  }}
                >
                  <ActivityIndicator size="large" color={palette.mint} />
                </View>
              ) : isAuthenticated && authRole === 'customer' && hasCompletedCustomerSetup === null ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.ink,
                  }}
                >
                  <ActivityIndicator size="large" color={palette.mint} />
                </View>
              ) : isAuthenticated && authRole === 'vendor' && hasCompletedVendorSetup === null ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: palette.ink,
                  }}
                >
                  <ActivityIndicator size="large" color={palette.mint} />
                </View>
              ) : shouldShowOnboarding ? (
                <OnboardingScreen onComplete={() => void handleCompleteOnboarding()} />
              ) : !selectedRole ? (
                <RoleSelectionScreen onSelectRole={(role) => void handleSelectRole(role)} />
              ) : !isAuthenticated ? (
                <EmailAuthScreen
                  role={selectedRole}
                  onBack={() => void handleBackToRoleSelection()}
                  onLogin={(email, password) => handleEmailLogin(email, password)}
                  onSignUp={(email, password) => handleEmailSignUp(email, password)}
                  onForgotPassword={(email) => handleForgotPassword(email)}
                />
              ) : authRole === 'customer' && !hasCompletedCustomerSetup ? (
                <CustomerSetupScreen
                  onBack={() => void handleBackFromCustomerSetup()}
                  onComplete={(profile) => void handleCompleteCustomerSetup(profile)}
                />
              ) : authRole === 'vendor' && !hasCompletedVendorSetup ? (
                <VendorSetupScreen
                  onBack={() => void handleBackFromVendorSetup()}
                  onComplete={(profile) => void handleCompleteVendorSetup(profile)}
                />
              ) : authRole === 'admin' && activeViewMode === 'admin' ? (
                <AdminModeScreen
                  onViewAsCustomer={() => void handleAdminViewModeChange('customer')}
                  onViewAsVendor={() => void handleAdminViewModeChange('vendor')}
                  onSignOut={() => void handleSignOut()}
                />
              ) : (
                <View style={{ flex: 1 }}>
                  {authRole === 'admin' && activeViewMode !== 'admin' ? (
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        backgroundColor: '#111827',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                        Admin preview: viewing as {activeViewMode}
                      </Text>
                      <Pressable onPress={() => void handleAdminViewModeChange('admin')}>
                        <Text style={{ color: '#7EE0B7', fontSize: 13, fontWeight: '800' }}>
                          Return to Admin
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <AppNavigator />
                </View>
              )}
            </MessagesProvider>
          </FavoritesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
