import { createClient } from 'jsr:@supabase/supabase-js@2';

type NotificationRequest = {
  conversationId?: string;
  messageBody?: string;
  senderName?: string;
};

type ConversationRow = {
  id: string;
  conversation_type: 'customer_vendor' | 'vendor_vendor' | null;
};

type ParticipantRow = {
  user_id: string;
  role: 'customer' | 'vendor';
};

type PreferenceRow = {
  message_notifications: boolean | null;
};

type PushTokenRow = {
  expo_push_token: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase server configuration' }, 500);
  }

  try {
    const payload = (await request.json()) as NotificationRequest;
    const conversationId = payload.conversationId?.trim();
    const messageBody = payload.messageBody?.trim();
    const senderName = payload.senderName?.trim() || 'New message';

    if (!conversationId || !messageBody) {
      return jsonResponse({ error: 'Missing conversationId or messageBody' }, 400);
    }

    const authHeader = request.headers.get('Authorization') ?? '';
    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!accessToken) {
      return jsonResponse({ error: 'Missing access token' }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: conversation, error: conversationError } = await adminClient
      .from('app_conversations')
      .select('id,conversation_type')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      return jsonResponse({ error: 'Conversation not found' }, 404);
    }

    const { data: participants, error: participantsError } = await adminClient
      .from('app_conversation_participants')
      .select('user_id,role')
      .eq('conversation_id', conversationId);

    if (participantsError) {
      return jsonResponse({ error: participantsError.message }, 500);
    }

    const participantRows = (participants ?? []) as ParticipantRow[];
    const recipient = participantRows.find((participant) => participant.user_id !== user.id);

    if (!recipient) {
      return jsonResponse({ delivered: false, reason: 'No recipient found' });
    }

    const { data: preferences } = await adminClient
      .from('notification_preferences')
      .select('message_notifications')
      .eq('user_id', recipient.user_id)
      .maybeSingle();

    if ((preferences as PreferenceRow | null)?.message_notifications === false) {
      return jsonResponse({ delivered: false, reason: 'Recipient disabled message notifications' });
    }

    const { data: pushTokens, error: pushTokensError } = await adminClient
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', recipient.user_id);

    if (pushTokensError) {
      return jsonResponse({ error: pushTokensError.message }, 500);
    }

    const tokenRows = (pushTokens ?? []) as PushTokenRow[];

    if (tokenRows.length === 0) {
      return jsonResponse({ delivered: false, reason: 'No push tokens registered' });
    }

    const notificationTitle =
      conversation.conversation_type === 'vendor_vendor'
        ? `New message from ${senderName}`
        : recipient.role === 'vendor'
          ? `New customer message`
          : `New message from ${senderName}`;

    const expoMessages = tokenRows.map((row) => ({
      to: row.expo_push_token,
      sound: 'default',
      title: notificationTitle,
      body:
        recipient.role === 'vendor' && conversation.conversation_type === 'customer_vendor'
          ? `${senderName}: ${messageBody}`
          : messageBody,
      data: {
        conversationId,
      },
    }));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expoMessages),
    });

    const expoResponseBody = await expoResponse.json();

    if (!expoResponse.ok) {
      return jsonResponse(
        {
          error: 'Expo push request failed',
          details: expoResponseBody,
        },
        502
      );
    }

    return jsonResponse({
      delivered: true,
      notifications: expoMessages.length,
      expo: expoResponseBody,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown notification error',
      },
      500
    );
  }
});
