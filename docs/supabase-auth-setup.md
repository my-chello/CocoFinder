# Supabase Auth Setup

## Environment

Create a local `.env` file with:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase dashboard

Enable these auth providers:

- Google
- Apple

Add redirect URLs for Expo / device auth:

- `cocofinder://auth/callback`
- your Expo development callback URL if you test inside Expo Go

## Database

Run the SQL in [supabase_profiles.sql](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/db/supabase_profiles.sql) to create the `profiles` table used for role-based routing.

Run the SQL in [supabase_vendor_profile.sql](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/db/supabase_vendor_profile.sql) to persist:

- vendor profile details
- vendor products
- live GPS status
- authenticated customer/vendor discovery reads
- vendor profile email linking fallback across sign-in methods

Run the SQL in [supabase_social.sql](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/db/supabase_social.sql) to persist:

- customer favorites
- customer conversations
- customer messages

Run the SQL in [supabase_demo_vendors.sql](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/db/supabase_demo_vendors.sql) if you also want the built-in dummy vendors to live in Supabase for map/vendor discovery.

## Routing behavior

- Customer login routes into the customer app flow
- Vendor login routes into vendor setup if no vendor profile exists
- Vendor login routes into the main app tabs if setup already exists
- Vendor setup/profile edits now sync to Supabase first, with local storage as fallback
- Vendor login can now fall back to an existing vendor profile with the same email address, even if the user signs in with a different provider
- Customer discovery screens now read Supabase vendor profiles/products when available and fall back to mock data if the tables are still empty
- Favorites and customer messages now also sync to Supabase when the social tables are available

## Notes

- Apple Sign In requires iOS support and a configured Apple provider in Supabase
- Google Sign In uses the Supabase OAuth browser flow and redirects back into the app
