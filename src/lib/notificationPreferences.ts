import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';
import { supabase } from './supabase';

export type NotificationPreferences = {
  messageNotifications: boolean;
  vendorUpdates: boolean;
  marketingNotifications: boolean;
};

type NotificationPreferencesRow = {
  user_id: string;
  message_notifications: boolean | null;
  vendor_updates: boolean | null;
  marketing_notifications: boolean | null;
};

const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'cocofinder:notification-preferences';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  messageNotifications: true,
  vendorUpdates: true,
  marketingNotifications: false,
};

function isMissingTableError(message?: string) {
  return Boolean(message && /relation .* does not exist/i.test(message));
}

function normalizeNotificationPreferences(
  value: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    messageNotifications:
      typeof value?.messageNotifications === 'boolean'
        ? value.messageNotifications
        : DEFAULT_NOTIFICATION_PREFERENCES.messageNotifications,
    vendorUpdates:
      typeof value?.vendorUpdates === 'boolean'
        ? value.vendorUpdates
        : DEFAULT_NOTIFICATION_PREFERENCES.vendorUpdates,
    marketingNotifications:
      typeof value?.marketingNotifications === 'boolean'
        ? value.marketingNotifications
        : DEFAULT_NOTIFICATION_PREFERENCES.marketingNotifications,
  };
}

function mapSupabaseRowToPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return normalizeNotificationPreferences({
    messageNotifications: row.message_notifications ?? undefined,
    vendorUpdates: row.vendor_updates ?? undefined,
    marketingNotifications: row.marketing_notifications ?? undefined,
  });
}

async function getSupabaseUserId() {
  if (!env.hasSupabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function getSupabaseNotificationPreferences(): Promise<NotificationPreferences | null> {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('user_id,message_notifications,vendor_updates,marketing_notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return mapSupabaseRowToPreferences(data as NotificationPreferencesRow);
}

async function saveSupabaseNotificationPreferences(preferences: NotificationPreferences) {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return;
  }

  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      message_notifications: preferences.messageNotifications,
      vendor_updates: preferences.vendorUpdates,
      marketing_notifications: preferences.marketingNotifications,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error && !isMissingTableError(error.message)) {
    throw error;
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const supabasePreferences = await getSupabaseNotificationPreferences();

    if (supabasePreferences) {
      await AsyncStorage.setItem(
        NOTIFICATION_PREFERENCES_STORAGE_KEY,
        JSON.stringify(supabasePreferences)
      );
      return supabasePreferences;
    }
  } catch {}

  const storedValue = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);

  if (!storedValue) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  try {
    return normalizeNotificationPreferences(JSON.parse(storedValue) as Partial<NotificationPreferences>);
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  const normalizedPreferences = normalizeNotificationPreferences(preferences);
  await AsyncStorage.setItem(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizedPreferences)
  );
  await saveSupabaseNotificationPreferences(normalizedPreferences);
}
