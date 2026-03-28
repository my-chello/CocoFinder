import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppRole } from '../../lib/auth';
import { getReadableAuthErrorMessage } from '../../lib/authMessages';

type EmailAuthMode = 'login' | 'signup';
type VerificationState = {
  email: string;
  roleLabel: string;
} | null;

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function EmailAuthScreen({
  role,
  onBack,
  onLogin,
  onSignUp,
  onForgotPassword,
}: {
  role: AppRole;
  onBack: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<'authenticated' | 'verification_required'>;
  onForgotPassword: (email: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<EmailAuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const roleLabel = role === 'vendor' ? 'Vendor' : role === 'admin' ? 'Admin' : 'Customer';

  const title = useMemo(
    () => (mode === 'login' ? 'Log in with email' : 'Create your account'),
    [mode]
  );

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!isValidEmail(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    if (mode === 'signup' && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'login') {
        await onLogin(email.trim(), password);
        return;
      }

      const result = await onSignUp(email.trim(), password);

      if (result === 'verification_required') {
        setVerificationState({
          email: email.trim(),
          roleLabel,
        });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setFieldErrors({});
        return;
      }
    } catch (error) {
      const message = getReadableAuthErrorMessage(error);
      Alert.alert(mode === 'login' ? 'Log in failed' : 'Sign up failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!isValidEmail(email)) {
      setFieldErrors({
        email: 'Please enter a valid email address',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onForgotPassword(email.trim());
      Alert.alert('Reset email sent', 'Check your inbox for the password reset link.');
    } catch (error) {
      const message = getReadableAuthErrorMessage(error);
      Alert.alert('Reset failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (verificationState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <Text style={styles.brandEmoji}>🛺</Text>
            <Text style={styles.brandText}>COCO FINDER</Text>
          </View>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.skipText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationIcon}>
              <Text style={styles.verificationIconText}>✉</Text>
            </View>
            <Text style={styles.verificationTitle}>Check your email</Text>
            <Text style={styles.verificationCopy}>
              We sent a verification email to {verificationState.email}. Verify your {verificationState.roleLabel.toLowerCase()} account and then log in with your email and password.
            </Text>

            <Pressable
              style={styles.submitButton}
              onPress={() => {
                setVerificationState(null);
                setMode('login');
              }}
            >
              <Text style={styles.submitButtonText}>Back to log in</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🛺</Text>
          <Text style={styles.brandText}>COCO FINDER</Text>
        </View>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.skipText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Use your email and password to continue as {roleLabel}</Text>
          </View>
        </View>

        <View style={styles.modeSwitcher}>
          <Pressable
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>Log in</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Sign up</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Email"
            placeholderTextColor="#8C97A8"
            style={[styles.input, fieldErrors.email && styles.inputError]}
          />
          {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder="Password"
            placeholderTextColor="#8C97A8"
            style={[styles.input, fieldErrors.password && styles.inputError]}
          />
          {fieldErrors.password ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
          ) : null}
          {mode === 'signup' ? (
            <>
              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="Confirm password"
                placeholderTextColor="#8C97A8"
                style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
              />
              {fieldErrors.confirmPassword ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
              ) : null}
            </>
          ) : null}

          <Pressable style={styles.secondaryLink} onPress={() => setShowPassword((value) => !value)}>
            <Text style={styles.secondaryLinkText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
          </Pressable>

          {mode === 'login' ? (
            <Pressable style={styles.secondaryLink} onPress={() => void handleForgotPassword()}>
              <Text style={styles.secondaryLinkText}>Forgot password?</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={styles.submitButtonText}>
            {mode === 'login' ? 'Log in with email' : 'Create account'}
          </Text>
        </Pressable>
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
    paddingBottom: 18,
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
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  backArrow: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '400',
    marginTop: 2,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: '#111827',
    fontSize: 31,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#111827',
  },
  modeText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 12,
  },
  input: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 18,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  fieldErrorText: {
    marginTop: -4,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryLink: {
    alignSelf: 'flex-start',
  },
  secondaryLinkText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  verificationCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 40,
  },
  verificationIcon: {
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationIconText: {
    color: '#0F766E',
    fontSize: 34,
    fontWeight: '900',
  },
  verificationTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  verificationCopy: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
