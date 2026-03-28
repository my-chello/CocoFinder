import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey =
  'placeholder-anon-key-placeholder-anon-key-placeholder-anon-key';

export const supabase = createClient(
  env.supabaseUrl ?? fallbackUrl,
  env.supabaseAnonKey ?? fallbackAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
