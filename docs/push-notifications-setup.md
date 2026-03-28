# Push Notifications Setup

This project now includes:

- device token registration in the app
- notification preferences in `Profile > App preferences`
- a Supabase Edge Function to send chat push notifications

## 1. Run database setup

Run this in Supabase SQL Editor:

- [supabase_all_in_one.sql](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/db/supabase_all_in_one.sql)

This creates:

- `notification_preferences`
- `push_tokens`

## 2. Deploy the Edge Function

Function path:

- [send-message-notification/index.ts](/c:/Users/mwede/OneDrive%20-%20Wederfoort-IT/Desktop/DEV-CocoFinder/supabase/functions/send-message-notification/index.ts)

Deploy with the Supabase CLI:

```bash
supabase functions deploy send-message-notification
```

## 3. Add required secret

The Edge Function uses the server key to:

- read conversation participants
- read notification preferences
- read push tokens
- send Expo push requests

Set this secret in Supabase:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Rebuild the app

Because `expo-notifications` was added, rebuild your native app after installing dependencies.

## 5. What happens now

When a user sends a message:

1. the message is saved in Supabase
2. the app invokes `send-message-notification`
3. the function finds the other participant
4. it checks `notification_preferences.message_notifications`
5. it sends a push notification to the recipient's Expo push tokens

## Notes

- Push delivery only works on a physical device, not a simulator
- The sender never receives their own notification
- If the recipient has no push token yet, the function exits safely
