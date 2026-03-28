import { env } from '../config/env';
import { supabase } from './supabase';

export async function getCurrentSupabaseUserId() {
  if (!env.hasSupabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export function isMissingRelationError(message?: string) {
  return Boolean(message && /relation .* does not exist/i.test(message));
}

export function formatRelativeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
