const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const googleMapsMapId = process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  googleMapsApiKey,
  googleMapsMapId,
  hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
  hasGoogleMapsApiKey: Boolean(googleMapsApiKey),
};
