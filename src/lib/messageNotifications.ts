import { env } from '../config/env';
import { supabase } from './supabase';

type SendMessageNotificationPayload = {
  conversationId: string;
  messageBody: string;
  senderName: string;
};

export async function sendMessageNotification(payload: SendMessageNotificationPayload) {
  if (!env.hasSupabase) {
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('send-message-notification', {
      body: payload,
    });

    if (error) {
      console.error('Failed to trigger message notification', error);
    }
  } catch (error) {
    console.error('Failed to invoke message notification function', error);
  }
}
