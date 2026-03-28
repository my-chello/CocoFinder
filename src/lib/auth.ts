import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppRole = 'vendor' | 'customer' | 'admin';
export type AuthProvider = 'google' | 'apple' | 'email';
export type AppViewMode = 'admin' | 'vendor' | 'customer';

export type AuthSession = {
  role: AppRole;
  provider: AuthProvider;
  viewMode: AppViewMode;
};

const AUTH_SESSION_STORAGE_KEY = 'cocofinder:auth-session';
const SELECTED_ROLE_STORAGE_KEY = 'cocofinder:selected-role';

export async function getSelectedRole() {
  const storedValue = await AsyncStorage.getItem(SELECTED_ROLE_STORAGE_KEY);

  if (storedValue === 'vendor' || storedValue === 'customer' || storedValue === 'admin') {
    return storedValue;
  }

  return null;
}

export async function setSelectedRole(role: AppRole) {
  await AsyncStorage.setItem(SELECTED_ROLE_STORAGE_KEY, role);
}

export async function clearSelectedRole() {
  await AsyncStorage.removeItem(SELECTED_ROLE_STORAGE_KEY);
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const storedValue = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as AuthSession;

    if (
      (parsed.role === 'vendor' || parsed.role === 'customer' || parsed.role === 'admin') &&
      (parsed.provider === 'google' || parsed.provider === 'apple' || parsed.provider === 'email') &&
      (parsed.viewMode === 'admin' || parsed.viewMode === 'vendor' || parsed.viewMode === 'customer')
    ) {
      return parsed;
    }
  } catch {}

  return null;
}

export async function createAuthSession(session: AuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function setAuthViewMode(viewMode: AppViewMode) {
  const session = await getAuthSession();

  if (!session) {
    return;
  }

  await createAuthSession({
    ...session,
    viewMode,
  });
}

export async function clearAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
