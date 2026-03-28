import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette } from '../../config/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useVendorData } from '../../hooks/useVendorData';

export function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const { favoriteVendorIds, toggleFavorite } = useFavorites();
  const locationState = useCurrentLocation();
  const { vendorTabRecords, reloadVendorData } = useVendorData(locationState.coords);
  const favoriteVendors = vendorTabRecords
    .filter((record) => favoriteVendorIds.includes(record.vendor.id))
    .sort((left, right) => {
      if (left.vendor.liveStatus !== right.vendor.liveStatus) {
        return left.vendor.liveStatus === 'live' ? -1 : 1;
      }

      return left.vendor.distanceKm - right.vendor.distanceKm;
    });

  useFocusEffect(
    useCallback(() => {
      void reloadVendorData();
    }, [reloadVendorData])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.eyebrow}>Favorites</Text>
              <Text style={styles.title}>Your saved stops</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{favoriteVendors.length} saved</Text>
            </View>
          </View>
          <Text style={styles.copy}>
            Save your top vendors here for quick access and future nearby alerts.
          </Text>
        </View>

        {favoriteVendors.length > 0 ? (
          favoriteVendors.map((record) => (
            <Pressable
              key={record.vendor.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('Vendors', {
                  screen: 'VendorDetail',
                  params: { vendorId: record.vendor.id },
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.identityWrap}>
                  <View style={styles.logoWrap}>
                    <Text style={styles.logoText}>
                      {record.vendor.imageSymbol ?? record.vendor.imageHint}
                    </Text>
                  </View>
                  <View style={styles.textWrap}>
                    <View style={styles.miniMetaRow}>
                      <Text style={styles.miniMetaText}>{record.vendor.category}</Text>
                      <Text style={styles.miniMetaDivider}>•</Text>
                      <Text style={styles.miniMetaText}>{record.vendor.distanceKm} km away</Text>
                    </View>
                    <Text style={styles.name}>{record.vendor.businessName}</Text>
                    <Text style={styles.meta}>{record.vendor.description}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.favoriteButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    toggleFavorite(record.vendor.id);
                  }}
                >
                  <Text style={styles.favoriteButtonText}>❤️</Text>
                </Pressable>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoPills}>
                  <View
                    style={[
                      styles.statusBadge,
                      record.vendor.liveStatus === 'live'
                        ? styles.statusBadgeLive
                        : styles.statusBadgeOffline,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        record.vendor.liveStatus === 'live'
                          ? styles.statusTextLive
                          : styles.statusTextOffline,
                      ]}
                    >
                      {record.vendor.liveStatus === 'live' ? 'Live now' : 'Offline'}
                    </Text>
                  </View>
                  <View style={styles.hoursPill}>
                    <Text style={styles.hours}>{record.vendor.operatingHours}</Text>
                  </View>
                </View>
                <Text style={styles.openProfile}>Open profile</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved vendors yet</Text>
            <Text style={styles.emptyCopy}>
              Save the vendors you want to revisit, track, and message faster later on.
            </Text>
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
  heroBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  },
  copy: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#F7F4ED',
    borderRadius: 28,
    padding: 18,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: palette.mint,
    fontSize: 22,
    fontWeight: '900',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  miniMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniMetaText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  miniMetaDivider: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  name: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '900',
  },
  meta: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonText: {
    color: '#B45309',
    fontSize: 17,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  infoPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusBadgeLive: {
    backgroundColor: palette.success,
  },
  statusBadgeOffline: {
    backgroundColor: palette.danger,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextLive: {
    color: palette.successText,
  },
  statusTextOffline: {
    color: palette.dangerText,
  },
  hoursPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hours: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  openProfile: {
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
