import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useVendorData } from '../hooks/useVendorData';
import { formatPriceForCountry } from '../lib/currency';
import { parseVendorOpeningHoursValue } from '../lib/vendorOpeningHours';
import { formatRelativeTimestamp, getCurrentSupabaseUserId, isMissingRelationError } from '../lib/social';
import { supabase } from '../lib/supabase';
import type { VendorTabRecord } from '../types/vendor';
import type { ChatMessage, ConversationSummary, ConversationType, MessageSenderRole } from '../types/messages';

type MessagesContextValue = {
  conversations: ConversationSummary[];
  getConversationById: (conversationId: string) => ConversationSummary | undefined;
  getMessagesForConversation: (conversationId: string) => ChatMessage[];
  openConversationForVendor: (vendorId: string) => Promise<string>;
  sendMessage: (conversationId: string, body: string) => void;
  markConversationRead: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  refreshMessages: () => Promise<void>;
};

type ConversationRow = {
  id: string;
  conversation_type: ConversationType | null;
  vendor_id: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: MessageSenderRole;
  is_deleted: boolean | null;
  unread_count: number | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: MessageSenderRole;
  sender_name: string;
  body: string;
  sent_at: string;
};

type PublicVendorProfileRow = {
  user_id: string;
  business_name: string | null;
  logo_symbol: string | null;
  category: string | null;
  is_live: boolean | null;
};

type ConversationProfileNameRow = {
  conversation_id: string;
  user_id: string;
  display_name: string | null;
  profile_photo_url?: string | null;
};

type FallbackVendorProfileRow = {
  user_id: string;
  business_name: string | null;
  logo_symbol: string | null;
  category: string | null;
  country: string | null;
  phone: string | null;
  opening_hours: string | null;
  about: string | null;
  is_live: boolean | null;
};

type FallbackVendorProductRow = {
  name: string;
  price_label: string;
};

type FallbackDemoVendorProfileRow = {
  id: string;
  owner_name: string | null;
  business_name: string | null;
  logo_symbol: string | null;
  category: string | null;
  country: string | null;
  phone: string | null;
  opening_hours: string | null;
  about: string | null;
  is_live: boolean | null;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

function isDemoVendorOwnerId(userId: string) {
  return userId.startsWith('demo-owner-');
}

function buildImageHint(name: string) {
  const initials = name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'VF';
}

function buildConversationId(
  conversationType: ConversationType,
  currentUserId: string,
  otherUserId: string,
  vendorId: string
) {
  if (conversationType === 'vendor_vendor') {
    const [left, right] = [currentUserId, otherUserId].sort();
    return `conversation-vendor-vendor-${left}-${right}-${vendorId}`;
  }

  return `conversation-customer-vendor-${currentUserId}-${vendorId}`;
}

function formatSortMinutesAgo(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function formatCustomerSenderName(email: string | null) {
  if (!email) {
    return 'Customer';
  }

  const handle = email.split('@')[0]?.trim();

  if (!handle) {
    return 'Customer';
  }

  return handle;
}

function formatDisplayName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const fullName = [firstName, lastName]
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || null;
}

function isMissingConversationProfileNamesFunctionError(code?: string, message?: string, details?: string) {
  return (
    code === 'PGRST202' &&
    /get_conversation_profile_names/i.test(`${message ?? ''} ${details ?? ''}`)
  );
}

async function getCurrentCustomerDisplayName() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 'Customer';
  }

  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('first_name,last_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!error) {
    const profileName = formatDisplayName(
      (profileRow as { first_name?: string | null } | null)?.first_name,
      (profileRow as { last_name?: string | null } | null)?.last_name
    );

    if (profileName) {
      return profileName;
    }
  }

  const metadataName = formatDisplayName(
    typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : null,
    typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name : null
  );

  if (metadataName) {
    return metadataName;
  }

  return formatCustomerSenderName(user.email?.trim() ?? null);
}

function getReadableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

async function fetchVendorRecordById(vendorId: string): Promise<VendorTabRecord | null> {
  if (vendorId.startsWith('supabase-vendor-')) {
    const userId = vendorId.replace('supabase-vendor-', '');
    const [{ data: profileRow, error: profileError }, { data: productRows, error: productsError }] =
      await Promise.all([
        supabase
          .from('vendor_profiles')
          .select('user_id,business_name,logo_symbol,category,country,phone,opening_hours,about,is_live')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('vendor_products')
          .select('name,price_label')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true }),
      ]);

    if (profileError || productsError) {
      return null;
    }

    const profile = profileRow as FallbackVendorProfileRow | null;
    const products = (productRows ?? []) as FallbackVendorProductRow[];
    const parsedOpeningHours = parseVendorOpeningHoursValue(profile?.opening_hours);

    if (!profile?.business_name || !profile.category) {
      return null;
    }

    return {
      vendor: {
        id: vendorId,
        userId: profile.user_id,
        businessName: profile.business_name,
        description: profile.about ?? 'No description yet.',
        category: profile.category,
        imageHint: buildImageHint(profile.business_name),
        imageSymbol: profile.logo_symbol ?? undefined,
        operatingHours: parsedOpeningHours.summary || 'Hours not set',
        phone: profile.phone ?? 'No phone',
        status: 'active',
        isOpen: Boolean(profile.is_live),
        rating: 4.8,
        distanceKm: 0.5,
        priceHint: products[0]?.price_label
          ? formatPriceForCountry(profile.country ?? 'Netherlands', products[0].price_label)
          : formatPriceForCountry(profile.country ?? 'Netherlands', '5'),
        liveStatus: profile.is_live ? 'live' : 'offline',
        eta: profile.is_live ? 'Live now' : 'Offline',
        nextArea: profile.country ?? 'Netherlands',
        tags: [profile.category, ...products.map((product) => product.name)],
      },
      owner: {
        id: profile.user_id,
        email: '',
        fullName: profile.business_name,
        role: 'vendor',
      },
      latestLocation: null,
      products: [],
      isFavorite: false,
      favoriteCount: 0,
    };
  }

  const [{ data: profileRow, error: profileError }, { data: productRows, error: productsError }] =
    await Promise.all([
      supabase
        .from('demo_vendor_profiles')
        .select('id,owner_name,business_name,logo_symbol,category,country,phone,opening_hours,about,is_live')
        .eq('id', vendorId)
        .maybeSingle(),
      supabase
        .from('demo_vendor_products')
        .select('name,price_label')
        .eq('vendor_id', vendorId)
        .order('sort_order', { ascending: true }),
    ]);

  if (profileError || productsError) {
    return null;
  }

  const profile = profileRow as FallbackDemoVendorProfileRow | null;
  const products = (productRows ?? []) as FallbackVendorProductRow[];
  const parsedOpeningHours = parseVendorOpeningHoursValue(profile?.opening_hours);

  if (!profile?.business_name || !profile.category) {
    return null;
  }

  return {
    vendor: {
      id: profile.id,
      userId: `demo-${profile.id}`,
      businessName: profile.business_name,
      description: profile.about ?? 'No description yet.',
      category: profile.category,
      imageHint: buildImageHint(profile.business_name),
      imageSymbol: profile.logo_symbol ?? undefined,
      operatingHours: parsedOpeningHours.summary || 'Hours not set',
      phone: profile.phone ?? 'No phone',
      status: 'active',
      isOpen: Boolean(profile.is_live),
      rating: 4.8,
      distanceKm: 0.5,
      priceHint: products[0]?.price_label
        ? formatPriceForCountry(profile.country ?? 'Netherlands', products[0].price_label)
        : formatPriceForCountry(profile.country ?? 'Netherlands', '5'),
      liveStatus: profile.is_live ? 'live' : 'offline',
      eta: profile.is_live ? 'Live now' : 'Offline',
      nextArea: profile.country ?? 'Netherlands',
      tags: [profile.category, ...products.map((product) => product.name)],
    },
    owner: {
      id: `demo-owner-${profile.id}`,
      email: '',
      fullName: profile.owner_name ?? profile.business_name,
      role: 'vendor',
    },
    latestLocation: null,
    products: [],
    isFavorite: false,
    favoriteCount: 0,
  };
}

function getConversationCustomerUserId(
  conversationType: ConversationType,
  currentParticipantRole: MessageSenderRole,
  currentUserId: string,
  otherParticipantRole: MessageSenderRole,
  otherParticipantUserId: string
) {
  if (conversationType !== 'customer_vendor') {
    return null;
  }

  if (currentParticipantRole === 'customer') {
    return currentUserId;
  }

  if (otherParticipantRole === 'customer') {
    return otherParticipantUserId;
  }

  return null;
}

function getConversationVendorUserId(
  conversationType: ConversationType,
  currentParticipantRole: MessageSenderRole,
  currentUserId: string,
  otherParticipantRole: MessageSenderRole,
  otherParticipantUserId: string
) {
  if (conversationType === 'vendor_vendor') {
    return currentUserId;
  }

  if (currentParticipantRole === 'vendor') {
    return currentUserId;
  }

  if (otherParticipantRole === 'vendor') {
    return otherParticipantUserId;
  }

  return null;
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { authRole, activeViewMode } = useAuth();
  const { vendorTabRecords } = useVendorData();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const isLoadingMessagesRef = useRef(false);
  const currentParticipantRole: MessageSenderRole =
    authRole === 'vendor' || (authRole === 'admin' && activeViewMode === 'vendor')
      ? 'vendor'
      : 'customer';

  const vendorRecordsByUserId = useMemo(
    () =>
      new Map(
        vendorTabRecords
          .filter((record) => Boolean(record.owner.id))
          .map((record) => [record.owner.id, record] as const)
      ),
    [vendorTabRecords]
  );

  const vendorRecordsByVendorId = useMemo(
    () => new Map(vendorTabRecords.map((record) => [record.vendor.id, record] as const)),
    [vendorTabRecords]
  );

  const loadFromSupabase = useCallback(async () => {
    if (isLoadingMessagesRef.current) {
      return;
    }

    isLoadingMessagesRef.current = true;

    try {
      const currentUserId = await getCurrentSupabaseUserId();

      if (!currentUserId) {
        setConversations([]);
        setMessages([]);
        return;
      }

      const { data: currentParticipantRows, error: currentParticipantsError } = await supabase
        .from('app_conversation_participants')
        .select('conversation_id,user_id,role,is_deleted,unread_count')
        .eq('user_id', currentUserId);

      if (currentParticipantsError) {
        if (!isMissingRelationError(currentParticipantsError.message)) {
          console.error('Failed to load current message participants', currentParticipantsError);
        }
        return;
      }

      const participantRowsForCurrentUser = (currentParticipantRows ?? []) as ParticipantRow[];
      const conversationIds = participantRowsForCurrentUser.map((participant) => participant.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        setMessages([]);
        return;
      }

      const [
        { data: conversationRows, error: conversationsError },
        { data: allParticipantRows, error: allParticipantsError },
        { data: messageRows, error: messagesError },
      ] = await Promise.all([
        supabase
          .from('app_conversations')
          .select('id,conversation_type,vendor_id,last_message_preview,last_message_at')
          .in('id', conversationIds),
        supabase
          .from('app_conversation_participants')
          .select('conversation_id,user_id,role,is_deleted,unread_count')
          .in('conversation_id', conversationIds),
        supabase
          .from('app_messages')
          .select('id,conversation_id,sender_user_id,sender_role,sender_name,body,sent_at')
          .in('conversation_id', conversationIds)
          .order('sent_at', { ascending: true }),
      ]);

      if (conversationsError || allParticipantsError || messagesError) {
        if (conversationsError && !isMissingRelationError(conversationsError.message)) {
          console.error('Failed to load conversations', conversationsError);
        }
        if (allParticipantsError && !isMissingRelationError(allParticipantsError.message)) {
          console.error('Failed to load conversation participants', allParticipantsError);
        }
        if (messagesError && !isMissingRelationError(messagesError.message)) {
          console.error('Failed to load messages', messagesError);
        }
        return;
      }

      const typedConversationRows = (conversationRows ?? []) as ConversationRow[];
      const typedParticipantRows = (allParticipantRows ?? []) as ParticipantRow[];
      const typedMessageRows = (messageRows ?? []) as MessageRow[];
      const participantUserIds = Array.from(new Set(typedParticipantRows.map((participant) => participant.user_id)));

      const [
        { data: vendorProfileRows, error: vendorProfilesError },
        { data: conversationProfileNameRows, error: conversationProfileNamesError },
      ] = await Promise.all([
        supabase
          .from('vendor_profiles')
          .select('user_id,business_name,logo_symbol,category,is_live')
          .in('user_id', participantUserIds),
        supabase.rpc('get_conversation_profile_names', {
          target_conversation_ids: conversationIds,
        }),
      ]);

      if (vendorProfilesError && !isMissingRelationError(vendorProfilesError.message)) {
        console.error('Failed to load vendor message metadata', vendorProfilesError);
      }
      if (
        conversationProfileNamesError &&
        !isMissingRelationError(conversationProfileNamesError.message) &&
        !isMissingConversationProfileNamesFunctionError(
          (conversationProfileNamesError as { code?: string }).code,
          conversationProfileNamesError.message,
          (conversationProfileNamesError as { details?: string }).details
        )
      ) {
        console.error('Failed to load conversation profile names', conversationProfileNamesError);
      }

      const vendorProfilesByUserId = new Map(
        ((vendorProfileRows ?? []) as PublicVendorProfileRow[]).map((row) => [row.user_id, row] as const)
      );
      const profileDisplayNameByConversationAndUser = new Map(
        ((conversationProfileNameRows ?? []) as ConversationProfileNameRow[])
          .filter((row) => Boolean(row.display_name?.trim()))
          .map((row) => [`${row.conversation_id}:${row.user_id}`, row.display_name!.trim()] as const)
      );
      const profilePhotoUrlByConversationAndUser = new Map(
        ((conversationProfileNameRows ?? []) as ConversationProfileNameRow[])
          .filter((row) => Boolean(row.profile_photo_url?.trim()))
          .map((row) => [`${row.conversation_id}:${row.user_id}`, row.profile_photo_url!.trim()] as const)
      );

      const participantsByConversation = new Map<string, ParticipantRow[]>();
      for (const participant of typedParticipantRows) {
        const currentParticipants = participantsByConversation.get(participant.conversation_id) ?? [];
        currentParticipants.push(participant);
        participantsByConversation.set(participant.conversation_id, currentParticipants);
      }

      const latestSenderNameByConversationAndUser = new Map<string, string>();
      for (const message of typedMessageRows) {
        if (message.sender_user_id) {
          latestSenderNameByConversationAndUser.set(
            `${message.conversation_id}:${message.sender_user_id}`,
            message.sender_name
          );
        }
      }

      const nextConversations = typedConversationRows
        .map((conversation): ConversationSummary | null => {
          const currentParticipant = participantRowsForCurrentUser.find(
            (participant) => participant.conversation_id === conversation.id
          );
          const participants = participantsByConversation.get(conversation.id) ?? [];
          const otherParticipant =
            participants.find((participant) => participant.user_id !== currentUserId) ?? null;
          const demoVendorRecord =
            !otherParticipant && conversation.vendor_id
              ? vendorRecordsByVendorId.get(conversation.vendor_id)
              : null;

          if (!currentParticipant) {
            return null;
          }

          const resolvedOtherParticipant =
            otherParticipant ??
            (demoVendorRecord
              ? {
                  conversation_id: conversation.id,
                  user_id: demoVendorRecord.owner.id,
                  role: 'vendor' as const,
                  is_deleted: false,
                  unread_count: 0,
                }
              : null);

          if (!resolvedOtherParticipant) {
            return null;
          }

          const otherVendorRecord =
            vendorRecordsByUserId.get(resolvedOtherParticipant.user_id) ??
            (conversation.vendor_id ? vendorRecordsByVendorId.get(conversation.vendor_id) : undefined);
          const otherVendorProfile = vendorProfilesByUserId.get(resolvedOtherParticipant.user_id);
          const otherParticipantProfileName = profileDisplayNameByConversationAndUser.get(
            `${conversation.id}:${resolvedOtherParticipant.user_id}`
          );
          const otherParticipantPhotoUrl = profilePhotoUrlByConversationAndUser.get(
            `${conversation.id}:${resolvedOtherParticipant.user_id}`
          );
          const latestOtherSenderName = latestSenderNameByConversationAndUser.get(
            `${conversation.id}:${resolvedOtherParticipant.user_id}`
          );

          const displayName =
            resolvedOtherParticipant.role === 'vendor'
              ? otherVendorProfile?.business_name ??
                otherVendorRecord?.vendor.businessName ??
                latestOtherSenderName ??
                'Vendor'
              : otherParticipantProfileName ?? latestOtherSenderName ?? 'Customer';
          const category =
            resolvedOtherParticipant.role === 'vendor'
              ? otherVendorProfile?.category ?? otherVendorRecord?.vendor.category ?? 'Vendor'
              : 'Customer inquiry';
          const symbol =
            resolvedOtherParticipant.role === 'vendor'
              ? otherVendorProfile?.logo_symbol ??
                otherVendorRecord?.vendor.imageSymbol ??
                otherVendorRecord?.vendor.imageHint
              : '👤';
          const isOtherParticipantLive =
            resolvedOtherParticipant.role === 'vendor'
              ? Boolean(
                  otherVendorProfile?.is_live ??
                    (otherVendorRecord ? otherVendorRecord.vendor.liveStatus === 'live' : false)
                )
              : false;

          return {
            id: conversation.id,
            conversationType: conversation.conversation_type ?? 'customer_vendor',
            vendorId: conversation.vendor_id ?? null,
            currentUserId,
            currentParticipantRole: currentParticipant.role,
            otherParticipantUserId: resolvedOtherParticipant.user_id,
            otherParticipantRole: resolvedOtherParticipant.role,
            vendorName: displayName,
            vendorCategory: category,
            vendorSymbol: symbol ?? undefined,
            otherParticipantPhotoUrl:
              resolvedOtherParticipant.role === 'customer' ? otherParticipantPhotoUrl : undefined,
            lastMessagePreview: conversation.last_message_preview ?? '',
            lastMessageAt: conversation.last_message_at
              ? formatRelativeTimestamp(conversation.last_message_at)
              : '',
            lastMessageSortMinutesAgo: formatSortMinutesAgo(conversation.last_message_at),
            unreadCount: Number(currentParticipant.unread_count ?? 0),
            isVendorLive: isOtherParticipantLive,
            isVisibleInInbox: !(currentParticipant.is_deleted ?? false),
          } satisfies ConversationSummary;
        })
        .filter((conversation): conversation is ConversationSummary => conversation !== null);

      const nextMessages: ChatMessage[] = typedMessageRows.map((message) => {
        const participantProfileName =
          message.sender_user_id
            ? profileDisplayNameByConversationAndUser.get(`${message.conversation_id}:${message.sender_user_id}`)
            : undefined;

        return {
          id: message.id,
          conversationId: message.conversation_id,
          senderUserId: message.sender_user_id ?? null,
          senderRole: message.sender_role,
          senderName:
            message.sender_role === 'customer'
              ? participantProfileName ?? message.sender_name ?? 'Customer'
              : message.sender_name,
          body: message.body,
          sentAt: formatRelativeTimestamp(message.sent_at),
        };
      });

      setConversations(nextConversations);
      setMessages(nextMessages);
    } catch (error) {
      console.error('Failed to refresh messages', error);
    } finally {
      isLoadingMessagesRef.current = false;
    }
  }, [vendorRecordsByUserId]);

  useEffect(() => {
    void loadFromSupabase();
  }, [loadFromSupabase]);

  useEffect(() => {
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.otherParticipantRole !== 'vendor') {
          return conversation;
        }

        const vendorRecord = vendorRecordsByUserId.get(conversation.otherParticipantUserId);

        if (!vendorRecord) {
          return conversation;
        }

        return {
          ...conversation,
          vendorName: vendorRecord.vendor.businessName,
          vendorCategory: vendorRecord.vendor.category,
          vendorSymbol: vendorRecord.vendor.imageSymbol ?? vendorRecord.vendor.imageHint,
          isVendorLive: vendorRecord.vendor.liveStatus === 'live',
        };
      })
    );
  }, [vendorRecordsByUserId]);

  useEffect(() => {
    const channel = supabase
      .channel('participant-messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_conversations' },
        () => {
          void loadFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_conversation_participants' },
        () => {
          void loadFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_messages' },
        () => {
          void loadFromSupabase();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadFromSupabase]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (intervalId) {
        return;
      }

      intervalId = setInterval(() => {
        if (AppState.currentState === 'active') {
          void loadFromSupabase();
        }
      }, 3000);
    }

    function stopPolling() {
      if (!intervalId) {
        return;
      }

      clearInterval(intervalId);
      intervalId = null;
    }

    startPolling();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void loadFromSupabase();
        startPolling();
        return;
      }

      stopPolling();
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [loadFromSupabase]);

  const sortedVisibleConversations = useMemo(
    () =>
      [...conversations]
        .filter((conversation) => conversation.isVisibleInInbox)
        .sort((left, right) => left.lastMessageSortMinutesAgo - right.lastMessageSortMinutesAgo),
    [conversations]
  );

  const getConversationById = useCallback(
    (conversationId: string) => conversations.find((conversation) => conversation.id === conversationId),
    [conversations]
  );

  const getMessagesForConversation = useCallback(
    (conversationId: string) => messages.filter((message) => message.conversationId === conversationId),
    [messages]
  );

  const openConversationForVendor = useCallback(
    async (vendorId: string) => {
      const vendorRecord =
        vendorTabRecords.find((record) => record.vendor.id === vendorId) ??
        (await fetchVendorRecordById(vendorId));

      if (!vendorRecord) {
        throw new Error('This vendor could not be found.');
      }

      const currentUserId = await getCurrentSupabaseUserId();

      if (!currentUserId) {
        throw new Error('Please log in before starting a conversation.');
      }

      if (vendorRecord.owner.id === currentUserId) {
        throw new Error('You cannot start a conversation with yourself.');
      }

      const conversationType: ConversationType =
        currentParticipantRole === 'vendor' ? 'vendor_vendor' : 'customer_vendor';
      const otherParticipantRole: MessageSenderRole = 'vendor';
      const isDemoVendorConversation = isDemoVendorOwnerId(vendorRecord.owner.id);
      const conversationId = buildConversationId(
        conversationType,
        currentUserId,
        vendorRecord.owner.id,
        vendorRecord.vendor.id
      );
      const existingConversation = conversations.find((conversation) => conversation.id === conversationId);

      if (existingConversation) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === existingConversation.id
              ? { ...conversation, isVisibleInInbox: true }
              : conversation
          )
        );
        return existingConversation.id;
      }

      const nextConversation: ConversationSummary = {
        id: conversationId,
        conversationType,
        vendorId: vendorRecord.vendor.id,
        currentUserId,
        currentParticipantRole,
        otherParticipantUserId: vendorRecord.owner.id,
        otherParticipantRole,
        vendorName: vendorRecord.vendor.businessName,
        vendorCategory: vendorRecord.vendor.category,
        vendorSymbol: vendorRecord.vendor.imageSymbol ?? vendorRecord.vendor.imageHint,
        lastMessagePreview: '',
        lastMessageAt: '',
        lastMessageSortMinutesAgo: Number.MAX_SAFE_INTEGER,
        unreadCount: 0,
        isVendorLive: vendorRecord.vendor.liveStatus === 'live',
        isVisibleInInbox: true,
      };

      setConversations((current) => [nextConversation, ...current]);

      try {
        const { error: conversationError } = await supabase.from('app_conversations').upsert(
          {
            id: nextConversation.id,
            conversation_type: conversationType,
            customer_user_id: getConversationCustomerUserId(
              conversationType,
              currentParticipantRole,
              currentUserId,
              otherParticipantRole,
              vendorRecord.owner.id
            ),
            vendor_user_id:
              isDemoVendorConversation && conversationType === 'customer_vendor'
                ? null
                : getConversationVendorUserId(
                    conversationType,
                    currentParticipantRole,
                    currentUserId,
                    otherParticipantRole,
                    vendorRecord.owner.id
                  ),
            vendor_id: vendorRecord.vendor.id,
            customer_deleted: false,
            vendor_deleted: false,
            customer_unread_count: 0,
            vendor_unread_count: 0,
            last_message_preview: '',
            last_message_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (conversationError && !isMissingRelationError(conversationError.message)) {
          throw conversationError;
        }

        const nowIso = new Date().toISOString();
        const participantUpserts = [
          {
            conversation_id: conversationId,
            user_id: currentUserId,
            role: currentParticipantRole,
            is_deleted: false,
            unread_count: 0,
            updated_at: nowIso,
          },
        ];

        if (!isDemoVendorConversation) {
          participantUpserts.push({
            conversation_id: conversationId,
            user_id: vendorRecord.owner.id,
            role: otherParticipantRole,
            is_deleted: false,
            unread_count: 0,
            updated_at: nowIso,
          });
        }

        const { error: participantsError } = await supabase
          .from('app_conversation_participants')
          .upsert(participantUpserts, { onConflict: 'conversation_id,user_id' });

        if (participantsError && !isMissingRelationError(participantsError.message)) {
          throw participantsError;
        }
      } catch (error) {
        setConversations((current) =>
          current.filter((conversation) => conversation.id !== nextConversation.id)
        );
        throw new Error(getReadableErrorMessage(error, 'Could not start a conversation right now.'));
      }

      return nextConversation.id;
    },
    [conversations, currentParticipantRole, vendorTabRecords]
  );

  const sendMessage = useCallback(
    (conversationId: string, body: string) => {
      const trimmedBody = body.trim();

      if (!trimmedBody) {
        return;
      }

      const conversation = conversations.find((item) => item.id === conversationId);

      if (!conversation) {
        return;
      }

      const nextMessage: ChatMessage = {
        id: `message-local-${Date.now()}`,
        conversationId,
        senderUserId: conversation.currentUserId,
        senderRole: conversation.currentParticipantRole,
        senderName: conversation.currentParticipantRole === 'vendor' ? 'Vendor' : 'Customer',
        body: trimmedBody,
        sentAt: 'Just now',
      };

      setMessages((current) => [...current, nextMessage]);
      setConversations((current) =>
        current.map((entry) =>
          entry.id === conversationId
            ? {
                ...entry,
                lastMessagePreview: trimmedBody,
                lastMessageAt: 'Just now',
                lastMessageSortMinutesAgo: 0,
                unreadCount: 0,
                isVisibleInInbox: true,
              }
            : {
                ...entry,
                lastMessageSortMinutesAgo:
                  entry.lastMessageSortMinutesAgo === Number.MAX_SAFE_INTEGER
                    ? Number.MAX_SAFE_INTEGER
                    : entry.lastMessageSortMinutesAgo + 1,
              }
        )
      );

      void (async () => {
        try {
          const currentUserId = await getCurrentSupabaseUserId();

          if (!currentUserId) {
            return;
          }

          const nowIso = new Date().toISOString();
          const isDemoVendorConversation = isDemoVendorOwnerId(conversation.otherParticipantUserId);
          const currentSenderName =
            conversation.currentParticipantRole === 'vendor'
              ? vendorRecordsByUserId.get(currentUserId)?.vendor.businessName ?? 'Vendor'
              : await getCurrentCustomerDisplayName();

          const { data: existingParticipants, error: existingParticipantsError } = await supabase
            .from('app_conversation_participants')
            .select('conversation_id,user_id,role,is_deleted,unread_count')
            .eq('conversation_id', conversationId);

          if (existingParticipantsError && !isMissingRelationError(existingParticipantsError.message)) {
            console.error('Failed to inspect conversation participants', existingParticipantsError);
            return;
          }

          const participantRows = (existingParticipants ?? []) as ParticipantRow[];
          const currentParticipant = participantRows.find((participant) => participant.user_id === currentUserId);
          const otherParticipant = participantRows.find(
            (participant) => participant.user_id === conversation.otherParticipantUserId
          );

          const { error: conversationError } = await supabase.from('app_conversations').upsert(
            {
              id: conversationId,
              conversation_type: conversation.conversationType,
              customer_user_id: getConversationCustomerUserId(
                conversation.conversationType,
                conversation.currentParticipantRole,
                currentUserId,
                conversation.otherParticipantRole,
                conversation.otherParticipantUserId
              ),
              vendor_user_id:
                isDemoVendorConversation && conversation.conversationType === 'customer_vendor'
                  ? null
                  : getConversationVendorUserId(
                      conversation.conversationType,
                      conversation.currentParticipantRole,
                      currentUserId,
                      conversation.otherParticipantRole,
                      conversation.otherParticipantUserId
                    ),
              vendor_id: conversation.vendorId ?? null,
              last_message_preview: trimmedBody,
              last_message_at: nowIso,
              updated_at: nowIso,
            },
            { onConflict: 'id' }
          );

          if (conversationError && !isMissingRelationError(conversationError.message)) {
            console.error('Failed to update conversation', conversationError);
          }

          const participantUpserts = [
            {
              conversation_id: conversationId,
              user_id: currentUserId,
              role: conversation.currentParticipantRole,
              is_deleted: false,
              unread_count: 0,
              updated_at: nowIso,
            },
          ];

          if (!isDemoVendorConversation) {
            participantUpserts.push({
              conversation_id: conversationId,
              user_id: conversation.otherParticipantUserId,
              role: conversation.otherParticipantRole,
              is_deleted: false,
              unread_count: Number(otherParticipant?.unread_count ?? 0) + 1,
              updated_at: nowIso,
            });
          }

          const { error: participantsError } = await supabase
            .from('app_conversation_participants')
            .upsert(participantUpserts, { onConflict: 'conversation_id,user_id' });

          if (participantsError && !isMissingRelationError(participantsError.message)) {
            console.error('Failed to update participant message state', participantsError);
          }

          const { error: messageError } = await supabase.from('app_messages').insert({
            id: nextMessage.id,
            conversation_id: conversationId,
            sender_user_id: currentUserId,
            sender_role: conversation.currentParticipantRole,
            sender_name: currentSenderName,
            body: trimmedBody,
            sent_at: nowIso,
          });

          if (messageError && !isMissingRelationError(messageError.message)) {
            console.error('Failed to save message', messageError);
            return;
          }

          await loadFromSupabase();
        } catch {}
      })();
    },
    [conversations, loadFromSupabase, vendorRecordsByUserId]
  );

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              unreadCount: 0,
            }
          : conversation
      )
    );

    void (async () => {
      try {
        const currentUserId = await getCurrentSupabaseUserId();

        if (!currentUserId) {
          return;
        }

        const { error } = await supabase
          .from('app_conversation_participants')
          .update({
            unread_count: 0,
            is_deleted: false,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId);

        if (error && !isMissingRelationError(error.message)) {
          console.error('Failed to mark conversation as read', error);
        }
      } catch {}
    })();
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              isVisibleInInbox: false,
            }
          : conversation
      )
    );

    void (async () => {
      try {
        const currentUserId = await getCurrentSupabaseUserId();

        if (!currentUserId) {
          return;
        }

        const { error } = await supabase
          .from('app_conversation_participants')
          .update({
            is_deleted: true,
            updated_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId);

        if (error && !isMissingRelationError(error.message)) {
          console.error('Failed to hide conversation', error);
        }
      } catch {}
    })();
  }, []);

  const value = useMemo(
    () => ({
      conversations: sortedVisibleConversations,
      getConversationById,
      getMessagesForConversation,
      openConversationForVendor,
      sendMessage,
      markConversationRead,
      deleteConversation,
      refreshMessages: loadFromSupabase,
    }),
    [
      deleteConversation,
      getConversationById,
      getMessagesForConversation,
      loadFromSupabase,
      markConversationRead,
      openConversationForVendor,
      sendMessage,
      sortedVisibleConversations,
    ]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }

  return context;
}
