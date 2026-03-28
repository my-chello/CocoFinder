import { useCallback, useState } from 'react';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette } from '../../config/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { useMessages } from '../../context/MessagesContext';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useVendorData } from '../../hooks/useVendorData';
import { VendorsStackParamList } from '../../navigation/VendorsNavigator';
import { getCurrentSupabaseUserId } from '../../lib/social';

type VendorDetailRoute = RouteProp<VendorsStackParamList, 'VendorDetail'>;
type NavigationAppOption = {
  id: 'apple-maps' | 'google-maps';
  label: string;
  icon: string;
  url: string;
};

function statusTone(status: string) {
  switch (status) {
    case 'active':
      return {
        backgroundColor: '#DCFCE7',
        color: '#166534',
      };
    case 'inactive':
      return {
        backgroundColor: '#FEF3C7',
        color: '#92400E',
      };
    case 'suspended':
      return {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
      };
    default:
      return {
        backgroundColor: '#E2E8F0',
        color: '#475569',
      };
  }
}

export function VendorDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<VendorDetailRoute>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { openConversationForVendor } = useMessages();
  const locationState = useCurrentLocation();
  const { vendorTabRecords, reloadVendorData } = useVendorData(locationState.coords);
  const [routeOptions, setRouteOptions] = useState<NavigationAppOption[]>([]);
  const [isRouteSheetOpen, setIsRouteSheetOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const record = vendorTabRecords.find((item) => item.vendor.id === route.params.vendorId);

  useFocusEffect(
    useCallback(() => {
      void reloadVendorData();
      void getCurrentSupabaseUserId().then(setCurrentUserId);
    }, [reloadVendorData])
  );

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.missingWrap}>
          <Text style={styles.missingTitle}>Vendor not found</Text>
          <Text style={styles.missingCopy}>
            The requested vendor profile could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tone = statusTone(record.vendor.status);
  const vendorRecord = record;
  const vendorIsFavorite = isFavorite(vendorRecord.vendor.id);
  const isOwnVendorProfile = currentUserId === vendorRecord.owner.id;

  async function openRouteInApp(option: NavigationAppOption) {
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendorRecord.latestLocation?.latitude},${vendorRecord.latestLocation?.longitude}&travelmode=driving`;

    try {
      await Linking.openURL(option.url);
      setIsRouteSheetOpen(false);
      } catch {
        try {
          await Linking.openURL(fallbackUrl);
          setIsRouteSheetOpen(false);
        } catch {
          Alert.alert('Route unavailable', 'Could not open a navigation app. Please try again later.');
        }
      }
  }

  async function openRoute() {
    if (!vendorRecord.latestLocation || vendorRecord.vendor.liveStatus !== 'live') {
      Alert.alert('Route unavailable', 'This vendor is not sharing a live route right now.');
      return;
    }

    const { latitude, longitude } = vendorRecord.latestLocation;
    const nextOptions: NavigationAppOption[] = [];

    if (Platform.OS === 'ios') {
      nextOptions.push({
        id: 'apple-maps',
        label: 'Apple Maps',
        icon: '🗺',
        url: `http://maps.apple.com/?daddr=${latitude},${longitude}`,
      });
    }

    const googleMapsUrl =
      Platform.OS === 'ios'
        ? `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`
        : `google.navigation:q=${latitude},${longitude}`;
    const googleMapsSupported = await Linking.canOpenURL(googleMapsUrl);

    if (googleMapsSupported) {
      nextOptions.push({
        id: 'google-maps',
        label: 'Google Maps',
        icon: '📍',
        url: googleMapsUrl,
      });
    }

    try {
      if (nextOptions.length === 0) {
        const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
        await Linking.openURL(fallbackUrl);
        return;
      }

      if (nextOptions.length === 1) {
        await openRouteInApp(nextOptions[0]);
        return;
      }

      setRouteOptions(nextOptions);
      setIsRouteSheetOpen(true);
    } catch {
      Alert.alert('Route unavailable', 'Could not open a navigation app. Please try again later.');
    }
  }

  async function openVendorChat() {
    if (isOwnVendorProfile) {
      Alert.alert('Chat unavailable', 'You cannot start a conversation with your own vendor profile.');
      return;
    }

    try {
      const conversationId = await openConversationForVendor(vendorRecord.vendor.id);

      navigation.navigate('Messages', {
        screen: 'ConversationDetail',
        params: { conversationId },
      });
    } catch (error) {
      Alert.alert(
        'Chat unavailable',
        error instanceof Error
          ? error.message
          : 'This conversation could not be started right now.'
      );
    }
  }

  function getProductIcon(name: string) {
    const normalizedName = name.toLowerCase();

    if (normalizedName.includes('coconut')) {
      return '🥥';
    }
    if (normalizedName.includes('coffee') || normalizedName.includes('latte')) {
      return '☕';
    }
    if (normalizedName.includes('fries')) {
      return '🍟';
    }
    if (normalizedName.includes('bbq') || normalizedName.includes('ribs')) {
      return '🍖';
    }
    if (normalizedName.includes('herring') || normalizedName.includes('fish')) {
      return '🐟';
    }
    if (normalizedName.includes('stroopwafel') || normalizedName.includes('pancake')) {
      return '🧇';
    }

    return '🍽️';
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.eyebrow}>Vendor spotlight</Text>
              <Text style={styles.heroTitle}>Drop into the next stop</Text>
            </View>
          </View>

          <View style={styles.heroTop}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoText}>
                {record.vendor.imageSymbol ?? record.vendor.imageHint}
              </Text>
            </View>
            <View style={styles.identity}>
              <View style={styles.heroMiniMeta}>
                <Text style={styles.heroMiniMetaText}>{record.vendor.category}</Text>
                <Text style={styles.heroMiniMetaDivider}>•</Text>
                <Text style={styles.heroMiniMetaText}>{record.vendor.distanceKm} km away</Text>
              </View>
              <Text style={styles.vendorName}>{record.vendor.businessName}</Text>
              <Text style={styles.meta}>
                Next stop: {record.vendor.nextArea ?? 'Route updating'}
              </Text>
            </View>
            <Pressable
              style={[
                styles.favoriteButton,
                vendorIsFavorite && styles.favoriteButtonActive,
              ]}
              onPress={() => toggleFavorite(record.vendor.id)}
            >
              <Text
                style={[
                  styles.favoriteButtonText,
                  vendorIsFavorite && styles.favoriteButtonTextActive,
                ]}
              >
                {vendorIsFavorite ? '❤️' : '♡'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.description}>{record.vendor.description}</Text>

          <View style={styles.infoPills}>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{record.vendor.operatingHours}</Text>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>{record.vendor.priceHint}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.liveBadge,
                record.vendor.liveStatus === 'live' ? styles.liveBadgeOn : styles.liveBadgeOff,
              ]}
            >
              <Text
                style={[
                  styles.liveBadgeText,
                  record.vendor.liveStatus === 'live'
                    ? styles.liveBadgeTextOn
                    : styles.liveBadgeTextOff,
                ]}
              >
                {record.vendor.liveStatus === 'live' ? 'LIVE NOW' : 'NOT LIVE'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: tone.backgroundColor }]}>
              <Text style={[styles.statusText, { color: tone.color }]}>
                {record.vendor.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.messageButton, isOwnVendorProfile && styles.messageButtonDisabled]}
              onPress={() => void openVendorChat()}
            >
              <Text
                style={[
                  styles.messageButtonText,
                  isOwnVendorProfile && styles.messageButtonTextDisabled,
                ]}
              >
                {isOwnVendorProfile ? 'Your profile' : 'Message vendor'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.routeButton,
                (!record.latestLocation || record.vendor.liveStatus !== 'live') &&
                  styles.routeButtonDisabled,
              ]}
              onPress={openRoute}
            >
              <Text
                style={[
                  styles.routeButtonText,
                  (!record.latestLocation || record.vendor.liveStatus !== 'live') &&
                    styles.routeButtonTextDisabled,
                ]}
              >
                Get route
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Visit timing</Text>
            <Text style={styles.sectionTitle}>Business hours</Text>
          </View>
          <Text style={styles.sectionValue}>{record.vendor.operatingHours}</Text>
          <Text style={styles.sectionSub}>
            {record.vendor.isOpen
              ? 'Open now for walk-ups and quick pickup.'
              : 'Currently closed, but you can still check products and send a message.'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Know the vendor</Text>
            <Text style={styles.sectionTitle}>Business details</Text>
          </View>
          <Text style={styles.sectionValue}>Phone: {record.vendor.phone}</Text>
          <Text style={styles.sectionSub}>
            Open status: {record.vendor.isOpen ? 'Open now' : 'Closed'}
          </Text>
          <Text style={styles.sectionSub}>Owner: {record.owner.fullName}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Live tracking</Text>
            <Text style={styles.sectionTitle}>Latest location</Text>
          </View>
          <Text style={styles.sectionValue}>
            {record.latestLocation
              ? `${record.latestLocation.latitude.toFixed(3)}, ${record.latestLocation.longitude.toFixed(3)}`
              : 'No GPS update yet'}
          </Text>
          <Text style={styles.sectionSub}>
            {record.latestLocation
              ? `Updated ${record.latestLocation.recordedAt}`
              : 'Waiting for vendor GPS ping'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Order preview</Text>
            <Text style={styles.sectionTitle}>Products & pricing</Text>
          </View>
          {record.products.map((product) => (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productIconWrap}>
                <Text style={styles.productIconText}>
                  {product.imageSymbol ?? getProductIcon(product.name)}
                </Text>
              </View>
              <View style={styles.productTextWrap}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
              </View>
              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>{product.priceLabel}</Text>
                <View
                  style={[
                    styles.productStateBadge,
                    product.isAvailable
                      ? styles.productStateBadgeAvailable
                      : styles.productStateBadgeUnavailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.productState,
                      product.isAvailable
                        ? styles.productStateAvailable
                        : styles.productStateUnavailable,
                    ]}
                  >
                    {product.isAvailable ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {isRouteSheetOpen ? (
        <View style={styles.routeSheetOverlay}>
          <Pressable style={styles.routeSheetBackdrop} onPress={() => setIsRouteSheetOpen(false)} />
          <View style={styles.routeSheet}>
            <View style={styles.routeSheetHandle} />
            <Text style={styles.routeSheetTitle}>Open with</Text>
            <View style={styles.routeOptionList}>
              {routeOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={styles.routeOptionButton}
                  onPress={() => void openRouteInApp(option)}
                >
                  <Text style={styles.routeOptionIcon}>{option.icon}</Text>
                  <Text style={styles.routeOptionLabel}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.routeCancelButton}
              onPress={() => setIsRouteSheetOpen(false)}
            >
              <Text style={styles.routeCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  missingWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingTitle: {
    color: palette.cloud,
    fontSize: 24,
    fontWeight: '800',
  },
  missingCopy: {
    marginTop: 8,
    color: '#B7C4D8',
    textAlign: 'center',
    lineHeight: 21,
  },
  heroCard: {
    backgroundColor: '#F6ECDF',
    borderRadius: 30,
    padding: 20,
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
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 6,
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  heroTop: {
    flexDirection: 'row',
    gap: 14,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: palette.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: palette.mint,
    fontSize: 24,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    justifyContent: 'center',
  },
  heroMiniMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroMiniMetaText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroMiniMetaDivider: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  favoriteButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  favoriteButtonActive: {
    backgroundColor: '#FDE68A',
  },
  favoriteButtonText: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '800',
  },
  favoriteButtonTextActive: {
    color: '#B45309',
  },
  vendorName: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  meta: {
    marginTop: 4,
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#324053',
    lineHeight: 22,
  },
  infoPills: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveBadgeOn: {
    backgroundColor: '#DCFCE7',
  },
  liveBadgeOff: {
    backgroundColor: '#E2E8F0',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  liveBadgeTextOn: {
    color: '#166534',
  },
  liveBadgeTextOff: {
    color: '#475569',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  messageButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: palette.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  messageButtonText: {
    color: palette.cloud,
    fontSize: 13,
    fontWeight: '800',
  },
  messageButtonTextDisabled: {
    color: '#475569',
  },
  routeButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: palette.mint,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  routeButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  routeButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  routeButtonTextDisabled: {
    color: '#64748B',
  },
  sectionCard: {
    backgroundColor: '#F7F4ED',
    borderRadius: 28,
    padding: 18,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
  },
  productIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIconText: {
    fontSize: 22,
  },
  productTextWrap: {
    flex: 1,
  },
  productName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  productDescription: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  productMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  productPrice: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  productStateBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  productStateBadgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  productStateBadgeUnavailable: {
    backgroundColor: '#FEE2E2',
  },
  productState: {
    fontSize: 12,
    fontWeight: '700',
  },
  productStateAvailable: {
    color: '#166534',
  },
  productStateUnavailable: {
    color: '#991B1B',
  },
  routeSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent: 'flex-end',
  },
  routeSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 8, 18, 0.48)',
  },
  routeSheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  routeSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  routeSheetTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  routeOptionList: {
    gap: 10,
  },
  routeOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeOptionIcon: {
    fontSize: 18,
  },
  routeOptionLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  routeCancelButton: {
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  routeCancelButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
});
