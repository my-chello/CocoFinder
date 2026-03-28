import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

type OnboardingSlide = {
  id: string;
  title: string;
  description: string;
  background: string;
  accent: string;
  phoneAccent: string;
  visualType: 'map' | 'chat' | 'route';
};

const slides: OnboardingSlide[] = [
  {
    id: 'track-vendors',
    title: 'Track nearby vendors',
    description: 'Find vendors around you in real time and never miss your favorite cart again.',
    background: '#E8669B',
    accent: '#22111A',
    phoneAccent: '#FFF3F7',
    visualType: 'map',
  },
  {
    id: 'chat-connect',
    title: 'Chat and ask instantly',
    description: 'Message vendors directly to check availability, ask questions, or confirm they are still nearby.',
    background: '#B3B6F4',
    accent: '#201B3A',
    phoneAccent: '#F8F8FF',
    visualType: 'chat',
  },
  {
    id: 'navigate-fast',
    title: 'Get directions instantly',
    description: 'Navigate straight to the vendor with one tap using your preferred map app.',
    background: '#FFDAB1',
    accent: '#3A2411',
    phoneAccent: '#FFF9F3',
    visualType: 'route',
  },
];

function OnboardingVisual({ slide }: { slide: OnboardingSlide }) {
  return (
    <View style={[styles.visualWrap, { backgroundColor: slide.background }]}>
      <View style={styles.phoneBackCard} />
      <View style={[styles.phoneCard, { backgroundColor: slide.phoneAccent }]}>
        <View style={styles.phoneHeader}>
          <Text style={[styles.phoneTime, { color: slide.accent }]}>12:22</Text>
          <View style={styles.phoneStatusRow}>
            <View style={[styles.phoneStatusDot, { backgroundColor: slide.accent }]} />
            <View style={[styles.phoneStatusDot, { backgroundColor: slide.accent }]} />
            <View style={[styles.phoneStatusBattery, { borderColor: slide.accent }]} />
          </View>
        </View>

        {slide.visualType === 'map' ? (
          <View style={styles.mockMapWrap}>
            <View style={styles.mockMapControls}>
              <View style={styles.mockSearchPill}>
                <Text style={styles.mockSearchIcon}>⌕</Text>
                <Text style={styles.mockSearchText}>Nearby vendors</Text>
              </View>
              <View style={styles.mockFilterPill}>
                <Text style={styles.mockFilterText}>Live now</Text>
              </View>
            </View>
            <View style={styles.mapGrid}>
              <View style={styles.mapStreetVerticalLeft} />
              <View style={styles.mapStreetVerticalRight} />
              <View style={styles.mapStreetHorizontalTop} />
              <View style={styles.mapStreetHorizontalBottom} />
              <View style={[styles.vendorPin, styles.vendorPinLeft]}>
                <Text style={styles.vendorPinEmoji}>🥥</Text>
              </View>
              <View style={[styles.vendorPin, styles.vendorPinCenter]}>
                <Text style={styles.vendorPinEmoji}>🍟</Text>
              </View>
              <View style={[styles.vendorPin, styles.vendorPinRight]}>
                <Text style={styles.vendorPinEmoji}>🍖</Text>
              </View>
            </View>
          </View>
        ) : null}

        {slide.visualType === 'chat' ? (
          <View style={styles.mockChatWrap}>
            <Text style={[styles.mockScreenTitle, { color: '#F59E0B' }]}>Chats</Text>
            <View style={styles.mockSearchBox}>
              <Text style={styles.mockSearchIcon}>⌕</Text>
              <Text style={styles.mockSearchPlaceholder}>Search</Text>
            </View>
            <View style={styles.mockChatList}>
              <View style={styles.mockChatRow}>
                <View style={styles.mockAvatar}>
                  <Text style={styles.mockAvatarText}>🥥</Text>
                </View>
                <View style={styles.mockChatText}>
                  <Text style={styles.mockChatName}>Cocero</Text>
                  <Text style={styles.mockChatPreview}>Fresh coconut water is available now.</Text>
                </View>
                <Text style={styles.mockChatUnread}>2</Text>
              </View>
              <View style={styles.mockChatRow}>
                <View style={styles.mockAvatar}>
                  <Text style={styles.mockAvatarText}>🍖</Text>
                </View>
                <View style={styles.mockChatText}>
                  <Text style={styles.mockChatName}>Truck I Pan Almere</Text>
                  <Text style={styles.mockChatPreview}>BBQ ribs are hot and ready.</Text>
                </View>
                <Text style={styles.mockChatUnread}>1</Text>
              </View>
            </View>
          </View>
        ) : null}

        {slide.visualType === 'route' ? (
          <View style={styles.mockRouteWrap}>
            <Text style={[styles.mockRouteHeader, { color: slide.accent }]}>Back to chat</Text>
            <View style={styles.routeMap}>
              <View style={styles.routeStreetOne} />
              <View style={styles.routeStreetTwo} />
              <View style={styles.routeStreetThree} />
              <View style={styles.routeLineVertical} />
              <View style={styles.routeLineHorizontal} />
              <View style={[styles.routePin, styles.routeUserPin]}>
                <Text style={styles.routePinText}>🙂</Text>
              </View>
              <View style={[styles.routePin, styles.routeVendorPin]}>
                <Text style={styles.routePinText}>📍</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const flatListRef = useRef<FlatList<OnboardingSlide> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function goToSlide(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  }

  function handleNext() {
    if (activeIndex === slides.length - 1) {
      onComplete();
      return;
    }

    goToSlide(activeIndex + 1);
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setActiveIndex(nextIndex);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: slides[activeIndex].background }]}>
      <View style={styles.root}>
        <View style={styles.skipRow}>
          <Pressable onPress={onComplete} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <OnboardingVisual slide={item} />
              <View style={styles.contentCard}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {slides.map((slide, index) => (
              <View
                key={slide.id}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>

          <Pressable
            style={[
              styles.floatingButton,
              activeIndex === slides.length - 1 && styles.floatingButtonWide,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.floatingButtonText}>
              {activeIndex === slides.length - 1 ? 'Get Started' : '→'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 6,
    zIndex: 2,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width: screenWidth,
    flex: 1,
  },
  visualWrap: {
    height: 455,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  phoneBackCard: {
    position: 'absolute',
    left: 18,
    top: 152,
    width: 248,
    height: 300,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.58)',
    transform: [{ rotate: '-2deg' }],
  },
  phoneCard: {
    alignSelf: 'center',
    width: 312,
    height: 380,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  phoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phoneStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  phoneStatusBattery: {
    width: 18,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.4,
  },
  mockMapWrap: {
    flex: 1,
    marginTop: 20,
  },
  mockMapControls: {
    gap: 10,
  },
  mockSearchPill: {
    height: 50,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  mockFilterPill: {
    alignSelf: 'flex-start',
    minWidth: 104,
    height: 42,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mockSearchIcon: {
    color: '#94A3B8',
    fontSize: 18,
  },
  mockSearchText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  mockFilterText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  mapGrid: {
    flex: 1,
    marginTop: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F2F3F5',
    overflow: 'hidden',
  },
  mapStreetVerticalLeft: {
    position: 'absolute',
    left: 66,
    top: -10,
    bottom: -10,
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  mapStreetVerticalRight: {
    position: 'absolute',
    right: 74,
    top: -10,
    bottom: -10,
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  mapStreetHorizontalTop: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: 84,
    height: 16,
    backgroundColor: '#FFFFFF',
  },
  mapStreetHorizontalBottom: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: 170,
    height: 16,
    backgroundColor: '#FFFFFF',
  },
  vendorPin: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFD7BF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF3EC',
  },
  vendorPinLeft: {
    left: 40,
    top: 118,
  },
  vendorPinCenter: {
    left: 128,
    top: 184,
  },
  vendorPinRight: {
    right: 32,
    top: 142,
  },
  vendorPinEmoji: {
    fontSize: 18,
  },
  mockChatWrap: {
    flex: 1,
    marginTop: 18,
  },
  mockScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  mockSearchBox: {
    marginTop: 18,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  mockSearchPlaceholder: {
    color: '#94A3B8',
    fontSize: 16,
  },
  mockChatList: {
    marginTop: 18,
    gap: 16,
  },
  mockChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mockAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockAvatarText: {
    fontSize: 20,
  },
  mockChatText: {
    flex: 1,
    gap: 3,
  },
  mockChatName: {
    color: '#FB923C',
    fontSize: 16,
    fontWeight: '800',
  },
  mockChatPreview: {
    color: '#64748B',
    fontSize: 13,
  },
  mockChatUnread: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#FB923C',
    color: '#FFFFFF',
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 22,
  },
  mockRouteWrap: {
    flex: 1,
    marginTop: 18,
  },
  mockRouteHeader: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  routeMap: {
    flex: 1,
    marginTop: 18,
    backgroundColor: '#F2F3F5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  routeStreetOne: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: 110,
    height: 14,
    backgroundColor: '#FFFFFF',
  },
  routeStreetTwo: {
    position: 'absolute',
    left: 88,
    top: 28,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  routeStreetThree: {
    position: 'absolute',
    right: 86,
    top: 28,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  routeLineVertical: {
    position: 'absolute',
    left: 94,
    top: 70,
    width: 5,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#FB923C',
  },
  routeLineHorizontal: {
    position: 'absolute',
    left: 96,
    top: 151,
    width: 118,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#FB923C',
  },
  routePin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE7D3',
    borderWidth: 3,
    borderColor: '#FFF5ED',
  },
  routeUserPin: {
    left: 78,
    top: 54,
  },
  routeVendorPin: {
    left: 206,
    top: 136,
  },
  routePinText: {
    fontSize: 18,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  description: {
    marginTop: 14,
    color: '#6B7280',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 320,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: '#B7B7B7',
  },
  dotActive: {
    backgroundColor: '#111827',
  },
  floatingButton: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 16,
    },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  floatingButtonWide: {
    width: 148,
  },
  floatingButtonText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
});
