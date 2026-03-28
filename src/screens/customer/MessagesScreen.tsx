import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { palette } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useMessages } from '../../context/MessagesContext';

export function MessagesScreen() {
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { authRole, activeViewMode } = useAuth();
  const { conversations, deleteConversation, refreshMessages } = useMessages();
  const bottomContentInset = tabBarHeight + Math.max(insets.bottom, 12) + 20;
  const isVendorMessageView = authRole === 'vendor' || (authRole === 'admin' && activeViewMode === 'vendor');

  useFocusEffect(
    useCallback(() => {
      void refreshMessages();
    }, [refreshMessages])
  );

  function confirmDelete(conversationId: string) {
    Alert.alert(
      'Delete conversation',
      'Are you sure you want to remove this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(conversationId),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentInset }]}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.eyebrow}>Messages</Text>
              <Text style={styles.title}>
                {isVendorMessageView ? 'Your inbox' : 'Chat with local vendors'}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {conversations.length} threads
              </Text>
            </View>
          </View>
          <Text style={styles.copy}>
            {isVendorMessageView
              ? 'See every customer and vendor conversation together in one calm inbox, sorted by the latest activity.'
              : 'Ask if a vendor is available, what they have in stock, and pick the thread back up anytime.'}
          </Text>
        </View>

        {conversations.length > 0 ? (
          conversations.map((thread) => (
            <Swipeable
              key={thread.id}
              overshootRight={false}
              renderRightActions={() => (
                <Pressable
                  style={styles.deleteAction}
                  onPress={() => confirmDelete(thread.id)}
                >
                  <Text style={styles.deleteActionText}>Delete</Text>
                </Pressable>
              )}
            >
              <Pressable
                style={styles.threadCard}
                onPress={() =>
                  navigation.navigate('ConversationDetail', {
                    conversationId: thread.id,
                  })
                }
              >
                <View style={styles.threadTop}>
                  <View style={styles.threadIdentity}>
                    <View style={styles.threadSymbolWrap}>
                      {thread.otherParticipantPhotoUrl ? (
                        <Image
                          source={{ uri: thread.otherParticipantPhotoUrl }}
                          style={styles.threadPhoto}
                        />
                      ) : (
                        <Text style={styles.threadSymbol}>
                          {thread.vendorSymbol ?? thread.vendorName[0]}
                        </Text>
                      )}
                    </View>
                    <View style={styles.threadTextWrap}>
                      <View style={styles.threadMiniMeta}>
                        <Text style={styles.threadMiniMetaText}>
                          {thread.otherParticipantRole === 'vendor' ? 'Vendor' : 'Customer'}
                        </Text>
                        <Text style={styles.threadMiniMetaDivider}>•</Text>
                        <Text style={styles.threadMiniMetaText}>
                          {isVendorMessageView
                            ? thread.otherParticipantRole === 'vendor'
                              ? thread.vendorCategory
                              : 'Customer thread'
                            : thread.isVendorLive
                              ? 'Live now'
                              : 'Offline'}
                        </Text>
                      </View>
                      <Text style={styles.threadVendor}>{thread.vendorName}</Text>
                      <Text style={styles.threadMeta}>{thread.lastMessagePreview}</Text>
                    </View>
                  </View>
                  <View style={styles.threadRight}>
                    <Text style={styles.threadTime}>{thread.lastMessageAt}</Text>
                    {thread.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{thread.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.threadFooter}>
                  <View
                    style={[
                      styles.threadStatusPill,
                      thread.isVendorLive
                        ? styles.threadStatusPillLive
                        : styles.threadStatusPillOffline,
                    ]}
                  >
                    <Text
                      style={[
                        styles.threadStatus,
                        thread.isVendorLive
                          ? styles.threadStatusLive
                          : styles.threadStatusOffline,
                      ]}
                    >
                      {isVendorMessageView
                        ? thread.otherParticipantRole === 'vendor'
                          ? 'Vendor chat'
                          : 'Customer chat'
                        : thread.isVendorLive
                          ? 'Live now'
                          : 'Offline'}
                    </Text>
                  </View>
                  <Text style={styles.threadOpen}>Open chat</Text>
                </View>
              </Pressable>
            </Swipeable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyCopy}>
              {isVendorMessageView
                ? 'Customer and vendor conversations will appear here as soon as someone starts a chat with your business.'
                : 'Start a chat with a vendor to keep availability, stock, and pickup details close by.'}
            </Text>
            {isVendorMessageView ? null : (
              <Pressable
                style={styles.emptyButton}
                onPress={() =>
                  navigation.navigate('Vendors', {
                    screen: 'VendorsList',
                  })
                }
              >
                <Text style={styles.emptyButtonText}>Browse vendors</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  hero: {
    backgroundColor: '#F6ECDF',
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  heroBadgeText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
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
    fontSize: 30,
    fontWeight: '900',
    flexShrink: 1,
  },
  copy: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 2,
  },
  threadCard: {
    backgroundColor: '#F7F4ED',
    borderRadius: 28,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  deleteAction: {
    marginBottom: 14,
    borderRadius: 28,
    backgroundColor: '#DC2626',
    width: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  threadIdentity: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  threadSymbolWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  threadPhoto: {
    width: '100%',
    height: '100%',
  },
  threadSymbol: {
    fontSize: 20,
    fontWeight: '800',
  },
  threadTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  threadMiniMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  threadMiniMetaText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  threadMiniMetaDivider: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  threadVendor: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  threadMeta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  threadRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  threadTime: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  threadStatusPillLive: {
    backgroundColor: '#DCFCE7',
  },
  threadStatusPillOffline: {
    backgroundColor: '#E2E8F0',
  },
  threadStatus: {
    fontSize: 12,
    fontWeight: '800',
  },
  threadStatusLive: {
    color: '#166534',
  },
  threadStatusOffline: {
    color: '#475569',
  },
  threadOpen: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#F6ECDF',
    borderRadius: 28,
    padding: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  emptyCopy: {
    color: '#64748B',
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 4,
    backgroundColor: palette.mint,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
});
