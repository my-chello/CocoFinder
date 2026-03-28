import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { palette } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessagesContext';
import { MessagesStackParamList } from '../../navigation/MessagesNavigator';

type ConversationRoute = RouteProp<MessagesStackParamList, 'ConversationDetail'>;

export function MessageConversationScreen() {
  const route = useRoute<ConversationRoute>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { authRole, activeViewMode } = useAuth();
  const [draft, setDraft] = useState('');
  const [composerHeight, setComposerHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const {
    getConversationById,
    getMessagesForConversation,
    markConversationRead,
    refreshMessages,
    sendMessage,
  } = useMessages();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const summary = getConversationById(route.params.conversationId);
  const messages = getMessagesForConversation(route.params.conversationId);
  const composerBottomInset = keyboardVisible ? 0 : tabBarHeight + Math.max(insets.bottom, 12);
  const isVendorMessageView = authRole === 'vendor' || (authRole === 'admin' && activeViewMode === 'vendor');

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    markConversationRead(route.params.conversationId);
  }, [markConversationRead, route.params.conversationId]);

  useFocusEffect(
    useCallback(() => {
      void refreshMessages();
      markConversationRead(route.params.conversationId);
    }, [markConversationRead, refreshMessages, route.params.conversationId])
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timeout);
  }, [messages.length, keyboardVisible]);

  function handleSend() {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    sendMessage(route.params.conversationId, trimmedDraft);
    setDraft('');
    inputRef.current?.clear();
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>Conversation not found</Text>
          <Text style={styles.missingCopy}>
            This chat could not be loaded right now.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isVendorToVendorThread = summary.conversationType === 'vendor_vendor';
  const livePillLabel = isVendorToVendorThread
    ? summary.isVendorLive
      ? 'Live now'
      : 'Offline'
    : summary.otherParticipantRole === 'customer'
      ? 'Customer thread'
      : summary.isVendorLive
        ? 'Live now'
        : 'Offline';
  const messagePlaceholder = isVendorToVendorThread
    ? 'Message vendor'
    : summary.otherParticipantRole === 'customer'
      ? 'Message customer'
      : `Message ${summary.vendorName}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 92 : 24}
      >
        <View style={styles.container}>
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={styles.headerIntro}>
                <Text style={styles.eyebrow}>Conversation</Text>
                <Text style={styles.title}>
                  {isVendorToVendorThread
                    ? 'Vendor to vendor'
                    : isVendorMessageView
                      ? 'Keep the chat moving'
                      : 'Stay close to the stop'}
                </Text>
              </View>
              <View
                style={[
                  styles.livePill,
                  livePillLabel === 'Live now' ? styles.livePillOn : styles.livePillOff,
                ]}
              >
                <Text
                  style={[
                    styles.livePillText,
                    livePillLabel === 'Live now' ? styles.livePillTextOn : styles.livePillTextOff,
                  ]}
                >
                  {livePillLabel}
                </Text>
              </View>
            </View>

            <View style={styles.headerRow}>
              <View style={styles.symbolWrap}>
                {summary.otherParticipantPhotoUrl ? (
                  <Image source={{ uri: summary.otherParticipantPhotoUrl }} style={styles.symbolImage} />
                ) : (
                  <Text style={styles.symbolText}>{summary.vendorSymbol ?? summary.vendorName[0]}</Text>
                )}
              </View>
              <View style={styles.headerText}>
                <Text style={styles.vendorName}>{summary.vendorName}</Text>
                <Text style={styles.vendorMeta}>
                  {isVendorToVendorThread
                    ? summary.vendorCategory
                    : isVendorMessageView
                      ? 'Customer inquiry'
                      : summary.vendorCategory}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={[
              styles.messagesContent,
              { paddingBottom: composerBottomInset + composerHeight + 12 },
            ]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.map((message) => {
              const isCurrentUserMessage = message.senderUserId === summary.currentUserId;

              return (
                <View
                  style={[
                    styles.messageRow,
                    isCurrentUserMessage ? styles.messageRowCustomer : styles.messageRowVendor,
                  ]}
                  key={message.id}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isCurrentUserMessage
                        ? styles.messageBubbleCustomer
                        : styles.messageBubbleVendor,
                    ]}
                  >
                    {!isCurrentUserMessage ? (
                      <Text style={styles.messageSender}>{message.senderName || summary.vendorName}</Text>
                    ) : null}
                    <Text
                      style={[
                        styles.messageBody,
                        isCurrentUserMessage
                          ? styles.messageBodyCustomer
                          : styles.messageBodyVendor,
                      ]}
                    >
                      {message.body}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isCurrentUserMessage
                          ? styles.messageTimeCustomer
                          : styles.messageTimeVendor,
                      ]}
                    >
                      {message.sentAt}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View
            style={[styles.composer, { marginBottom: composerBottomInset }]}
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              setComposerHeight((current) => (current === nextHeight ? current : nextHeight));
            }}
          >
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={messagePlaceholder}
              placeholderTextColor="#7C8BA1"
              style={styles.input}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  keyboardAvoider: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 14,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingTitle: {
    color: palette.cloud,
    fontSize: 24,
    fontWeight: '800',
  },
  missingCopy: {
    marginTop: 8,
    color: '#B7C4D8',
    fontSize: 14,
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#F8F4ED',
    borderRadius: 28,
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIntro: {
    flex: 1,
  },
  eyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  livePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  livePillOn: {
    backgroundColor: '#DCEEFF',
  },
  livePillOff: {
    backgroundColor: '#E9EEF5',
  },
  livePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  livePillTextOn: {
    color: '#0A84FF',
  },
  livePillTextOff: {
    color: '#475569',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  symbolWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  symbolImage: {
    width: '100%',
    height: '100%',
  },
  symbolText: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  vendorName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  vendorMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowCustomer: {
    justifyContent: 'flex-end',
  },
  messageRowVendor: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 6,
  },
  messageBubbleCustomer: {
    backgroundColor: '#0A84FF',
    borderBottomRightRadius: 10,
  },
  messageBubbleVendor: {
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 10,
  },
  messageSender: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageBodyCustomer: {
    color: '#FFFFFF',
  },
  messageBodyVendor: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageTimeCustomer: {
    color: 'rgba(255,255,255,0.82)',
  },
  messageTimeVendor: {
    color: '#64748B',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 110,
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingBottom: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#F4F5F7',
    borderRadius: 22,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 999,
    minWidth: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
