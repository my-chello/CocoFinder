import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { env } from '../config/env';
import { supabase } from './supabase';
import { getNotificationPreferences } from './notificationPreferences';

const PUSH_TOKEN_STORAGE_KEY = 'cocofinder:expo-push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isMissingTableError(message?: string) {
  return Boolean(message && /relation .* does not exist/i.test(message));
}

async function getCurrentUserId() {
  if (!env.hasSupabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getExpoProjectId() {
  const easProjectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    null;

  return typeof easProjectId === 'string' && easProjectId.trim() ? easProjectId : undefined;
}

async function savePushToken(userId: string, expoPushToken: string) {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_name: Device.deviceName ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'expo_push_token',
    }
  );

  if (error && !isMissingTableError(error.message)) {
    throw error;
  }
}

export async function registerDevicePushToken() {
  if (!env.hasSupabase || !Device.isDevice) {
    return null;
  }

  const preferences = await getNotificationPreferences();

  if (!preferences.messageNotifications) {
    return null;
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: getExpoProjectId(),
  });
  const expoPushToken = tokenResponse.data;

  if (!expoPushToken) {
    return null;
  }

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  await savePushToken(userId, expoPushToken);
  return expoPushToken;
}

export async function unregisterDevicePushToken() {
  if (!env.hasSupabase) {
    return;
  }

  const storedPushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

  if (!storedPushToken) {
    return;
  }

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('expo_push_token', storedPushToken);

  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

  if (error && !isMissingTableError(error.message)) {
    throw error;
  }
}
