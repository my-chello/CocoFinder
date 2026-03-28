import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AppRole, AuthProvider } from './auth';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type OAuthSessionParams = {
  access_token: string;
  refresh_token: string;
};

type SupabaseRole = Extract<AppRole, 'vendor' | 'customer'>;

function isMissingProfilesTableError(message?: string) {
  if (!message) {
    return false;
  }

  return (
    /relation .*profiles/i.test(message) ||
    /could not find the table ['"]?public\.profiles['"]? in the schema cache/i.test(message)
  );
}

export function getAuthRedirectUrl() {
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('auth/callback');
  }

  return 'cocofinder://auth/callback';
}

function getRedirectConfigurationHint(redirectTo: string) {
  if (Constants.appOwnership === 'expo') {
    return `Expo Go detected. Add this exact URL to Supabase Redirect URLs: ${redirectTo}`;
  }

  return `Add this exact URL to Supabase Redirect URLs: ${redirectTo}`;
}

function generateNonce(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint8Array(length);
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => chars[value % chars.length]).join('');
  }

  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function parseOAuthSessionFromUrl(url: string): OAuthSessionParams | null {
  const [withoutHash, hash = ''] = url.split('#');
  const queryString = withoutHash.includes('?') ? withoutHash.split('?')[1] ?? '' : '';
  const params = new URLSearchParams(hash || queryString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function normalizeSupabaseRole(value: unknown): SupabaseRole | null {
  return value === 'vendor' || value === 'customer' ? value : null;
}

export async function getSupabaseAppRole(): Promise<SupabaseRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profileResult = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profileResult.error && !isMissingProfilesTableError(profileResult.error.message)) {
    throw profileResult.error;
  }

  const roleFromProfile = normalizeSupabaseRole(profileResult.data?.role);

  if (roleFromProfile) {
    return roleFromProfile;
  }

  return normalizeSupabaseRole(user.user_metadata?.app_role);
}

export async function syncSupabaseRole(role: Extract<AppRole, 'vendor' | 'customer'>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No authenticated Supabase user found.');
  }

  const updatedMetadata = {
    ...(user.user_metadata ?? {}),
    app_role: role,
  };

  await supabase.auth.updateUser({
    data: updatedMetadata,
  });

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      role,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error && !isMissingProfilesTableError(error.message)) {
    throw error;
  }
}

export async function signInWithGoogle() {
  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error('No Google auth URL returned by Supabase.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    throw new Error(
      `Google sign-in did not return to the app. ${getRedirectConfigurationHint(redirectTo)}`
    );
  }

  if (!result.url.startsWith(redirectTo)) {
    throw new Error(
      `Google sign-in returned to an unexpected URL: ${result.url}. Supabase is probably falling back to Site URL instead of your app callback. ${getRedirectConfigurationHint(
        redirectTo
      )}`
    );
  }

  const sessionParams = parseOAuthSessionFromUrl(result.url);

  if (!sessionParams) {
    throw new Error(
      `Supabase did not return a valid session after Google sign-in. ${getRedirectConfigurationHint(
        redirectTo
      )}`
    );
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession(sessionParams);

  if (sessionError) {
    throw sessionError;
  }

  return sessionData.session;
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS in this app.');
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Apple Sign In is not available on this device.');
  }

  const nonce = generateNonce();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  role: Extract<AppRole, 'vendor' | 'customer'>
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        app_role: role,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = getAuthRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function signInWithSupabaseProvider(provider: AuthProvider) {
  if (provider === 'google') {
    return signInWithGoogle();
  }

  if (provider === 'email') {
    throw new Error('Use the dedicated email auth flow for email/password sign-in.');
  }

  return signInWithApple();
}
