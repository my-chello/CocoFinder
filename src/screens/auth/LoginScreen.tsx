import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppRole, AuthProvider } from '../../lib/auth';
import { getReadableAuthErrorMessage } from '../../lib/authMessages';

export function LoginScreen({
  role,
  onBack,
  onSelectProvider,
  onSelectEmail,
}: {
  role: AppRole;
  onBack: () => void;
  onSelectProvider: (provider: AuthProvider) => Promise<void>;
  onSelectEmail: () => void;
}) {
  const [activeProvider, setActiveProvider] = useState<AuthProvider | null>(null);
  const roleLabel =
    role === 'vendor' ? 'Vendor' : role === 'admin' ? 'Admin' : 'Customer';

  async function handleProviderPress(provider: AuthProvider) {
    try {
      setActiveProvider(provider);
      await onSelectProvider(provider);
    } catch (error) {
      const message = getReadableAuthErrorMessage(error);
      Alert.alert('Sign in failed', message);
    } finally {
      setActiveProvider(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🛺</Text>
          <Text style={styles.brandText}>COCO FINDER</Text>
        </View>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.illustrationWrap}>
        <View style={styles.streetLampPole} />
        <View style={styles.streetLampArm} />
        <View style={styles.streetLampHead} />
        <View style={styles.streetLampGlow} />
        <View style={styles.bikeVendor}>
          <View style={styles.vendorCanopy} />
          <View style={styles.vendorCart} />
          <View style={styles.vendorWheelLeft} />
          <View style={styles.vendorWheelRight} />
          <View style={styles.vendorPersonHead} />
          <View style={styles.vendorPersonBody} />
          <View style={styles.vendorPersonLeg} />
        </View>
      </View>

      <View style={styles.sheet}>
        <View style={styles.loginHeaderRow}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.loginTitleWrap}>
            <Text style={styles.loginTitle}>Login</Text>
            <Text style={styles.loginSubtitle}>Sign in to continue as {roleLabel}</Text>
          </View>
        </View>

        <View style={styles.loginButtons}>
          <Pressable
            style={[styles.providerButton, activeProvider && styles.providerButtonDisabled]}
            onPress={() => void handleProviderPress('google')}
            disabled={Boolean(activeProvider)}
          >
            <Text style={styles.providerIconGoogle}>G</Text>
            <Text style={styles.providerText}>
              {activeProvider === 'google' ? 'Connecting to Google...' : 'Sign in with Google'}
            </Text>
            {activeProvider === 'google' ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : null}
          </Pressable>

          <Pressable
            style={[styles.providerButton, activeProvider && styles.providerButtonDisabled]}
            onPress={() => void handleProviderPress('apple')}
            disabled={Boolean(activeProvider)}
          >
            <Text style={styles.providerIconApple}></Text>
            <Text style={styles.providerText}>
              {activeProvider === 'apple' ? 'Connecting to Apple...' : 'Sign in with Apple'}
            </Text>
            {activeProvider === 'apple' ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : null}
          </Pressable>

          <Pressable
            style={[styles.providerButton, activeProvider && styles.providerButtonDisabled]}
            onPress={onSelectEmail}
            disabled={Boolean(activeProvider)}
          >
            <Text style={styles.providerIconEmail}>@</Text>
            <Text style={styles.providerText}>Continue with Email</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6ECDF',
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmoji: {
    fontSize: 22,
  },
  brandText: {
    color: '#573226',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  skipText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  illustrationWrap: {
    height: 340,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
  },
  streetLampPole: {
    position: 'absolute',
    left: 88,
    top: 78,
    width: 10,
    height: 210,
    borderRadius: 999,
    backgroundColor: '#B7C5C5',
  },
  streetLampArm: {
    position: 'absolute',
    left: 88,
    top: 82,
    width: 52,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#B7C5C5',
  },
  streetLampHead: {
    position: 'absolute',
    left: 58,
    top: 88,
    width: 32,
    height: 20,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#9BA9A9',
  },
  streetLampGlow: {
    position: 'absolute',
    left: 64,
    top: 108,
    width: 22,
    height: 12,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#FFD866',
  },
  bikeVendor: {
    alignSelf: 'center',
    width: 220,
    height: 210,
    position: 'relative',
  },
  vendorCanopy: {
    position: 'absolute',
    left: 52,
    top: 38,
    width: 92,
    height: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: '#FF9D96',
  },
  vendorCart: {
    position: 'absolute',
    left: 42,
    top: 62,
    width: 110,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#FF645E',
  },
  vendorWheelLeft: {
    position: 'absolute',
    left: 52,
    bottom: 42,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#2F2F39',
  },
  vendorWheelRight: {
    position: 'absolute',
    left: 132,
    bottom: 42,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#2F2F39',
  },
  vendorPersonHead: {
    position: 'absolute',
    right: 38,
    top: 56,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#7ACA67',
  },
  vendorPersonBody: {
    position: 'absolute',
    right: 26,
    top: 82,
    width: 52,
    height: 72,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    backgroundColor: '#FF645E',
    transform: [{ rotate: '8deg' }],
  },
  vendorPersonLeg: {
    position: 'absolute',
    right: 42,
    top: 142,
    width: 24,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#2D3748',
    transform: [{ rotate: '10deg' }],
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 26,
  },
  loginHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  backArrow: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '400',
    marginTop: 2,
  },
  loginTitleWrap: {
    flex: 1,
    gap: 6,
  },
  loginTitle: {
    color: '#111827',
    fontSize: 31,
    fontWeight: '800',
  },
  loginSubtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
  },
  loginButtons: {
    gap: 18,
  },
  providerButton: {
    height: 90,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  providerButtonDisabled: {
    opacity: 0.82,
  },
  providerIconGoogle: {
    color: '#EA4335',
    fontSize: 34,
    fontWeight: '900',
    width: 38,
    textAlign: 'center',
  },
  providerIconApple: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '700',
    width: 38,
    textAlign: 'center',
  },
  providerIconEmail: {
    color: '#0F766E',
    fontSize: 30,
    fontWeight: '900',
    width: 38,
    textAlign: 'center',
  },
  providerText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
});
