export type MessageSenderRole = 'customer' | 'vendor';
export type ConversationType = 'customer_vendor' | 'vendor_vendor';

export type ConversationSummary = {
  id: string;
  conversationType: ConversationType;
  vendorId?: string | null;
  currentUserId: string;
  currentParticipantRole: MessageSenderRole;
  otherParticipantUserId: string;
  otherParticipantRole: MessageSenderRole;
  vendorName: string;
  vendorCategory: string;
  vendorSymbol?: string;
  otherParticipantPhotoUrl?: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  lastMessageSortMinutesAgo: number;
  unreadCount: number;
  isVendorLive: boolean;
  isVisibleInInbox: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderRole: MessageSenderRole;
  senderName: string;
  body: string;
  sentAt: string;
};
