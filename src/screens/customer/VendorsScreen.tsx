import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { palette } from '../../config/theme';
import { useFavorites } from '../../context/FavoritesContext';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useVendorData } from '../../hooks/useVendorData';
import { searchVendorRecords } from '../../lib/search';
import { VendorsStackParamList } from '../../navigation/VendorsNavigator';

export function VendorsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<VendorsStackParamList, 'VendorsList'>>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const locationState = useCurrentLocation();
  const { vendorTabRecords, reloadVendorData } = useVendorData(locationState.coords);
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const nearbyVendors = vendorTabRecords
    .filter((record) => record.vendor.liveStatus === 'live')
    .sort((left, right) => left.vendor.distanceKm - right.vendor.distanceKm);
  const searchResults = searchVendorRecords(nearbyVendors, debouncedSearchText);
  const filteredVendors = debouncedSearchText.trim() ? searchResults : [];
  const displayedVendors = debouncedSearchText.trim() ? filteredVendors : nearbyVendors;

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
            <View style={styles.heroCopyWrap}>
              <Text style={styles.eyebrow}>Curated nearby</Text>
              <Text style={styles.title}>Browse live vendors</Text>
            </View>
            <View style={styles.heroCountPill}>
              <Text style={styles.heroCountText}>{nearbyVendors.length} live</Text>
            </View>
          </View>
          <Text style={styles.copy}>
            Explore nearby stops, save favorites, and jump into the vendor profile that feels right for right now.
          </Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search vendors or products"
            placeholderTextColor="#7C8BA1"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {debouncedSearchText.trim() ? 'Search results' : 'Live nearby now'}
          </Text>
          <Text style={styles.sectionMeta}>{displayedVendors.length} shown</Text>
        </View>

        <View style={styles.listWrap}>
          {displayedVendors.length > 0 ? (
            displayedVendors.map((item) => {
              const record = 'record' in item ? item.record : item;
              const matchedProductName =
                'matchedProductName' in item ? item.matchedProductName : undefined;
              const vendorIsFavorite = isFavorite(record.vendor.id);

              return (
                <Pressable
                  key={record.vendor.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('VendorDetail', { vendorId: record.vendor.id })
                  }
                >
                  <View style={styles.cardTop}>
                    <View style={styles.logoWrap}>
                      <Text style={styles.logoText}>
                        {record.vendor.imageSymbol ?? record.vendor.imageHint}
                      </Text>
                    </View>

                    <View style={styles.main}>
                      <View style={styles.topLine}>
                        <View style={styles.titleWrap}>
                          <Text style={styles.name}>{record.vendor.businessName}</Text>
                          <Text style={styles.meta}>
                            {record.vendor.category} • {record.vendor.distanceKm} km away
                          </Text>
                        </View>
                        <View style={styles.liveBadge}>
                          <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                      </View>

                      <Text style={styles.description}>{record.vendor.description}</Text>
                      {matchedProductName ? (
                        <Text style={styles.matchText}>Matching product: {matchedProductName}</Text>
                      ) : null}
                    </View>

                    <Pressable
                      style={[
                        styles.favoriteButton,
                        vendorIsFavorite && styles.favoriteButtonActive,
                      ]}
                      onPress={(event) => {
                        event.stopPropagation();
                        toggleFavorite(record.vendor.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.favoriteButtonText,
                          vendorIsFavorite && styles.favoriteButtonTextActive,
                        ]}
                      >
                        {vendorIsFavorite ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.infoPill}>
                      <Text style={styles.infoPillText}>{record.vendor.operatingHours}</Text>
                    </View>
                    <View style={styles.infoPill}>
                      <Text style={styles.infoPillText}>{record.vendor.priceHint}</Text>
                    </View>
                    <View style={styles.infoPillAccent}>
                      <Text style={styles.infoPillAccentText}>Open profile</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No results found</Text>
              <Text style={styles.emptyStateCopy}>Try a different search or clear the current query.</Text>
            </View>
          )}
        </View>
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
    gap: 16,
    paddingBottom: 32,
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
  heroCopyWrap: {
    flex: 1,
  },
  heroCountPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroCountText: {
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
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
  searchIcon: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listWrap: {
    gap: 14,
  },
  row: {
    backgroundColor: '#F7F4ED',
    borderRadius: 30,
    padding: 16,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: palette.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: palette.mint,
    fontSize: 20,
    fontWeight: '900',
  },
  main: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
  },
  name: {
    flexShrink: 1,
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  liveBadge: {
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  description: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
  matchText: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
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
  infoPillAccent: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoPillAccentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: '#FDE68A',
  },
  favoriteButtonText: {
    color: '#475569',
    fontSize: 17,
    fontWeight: '800',
  },
  favoriteButtonTextActive: {
    color: '#92400E',
  },
  emptyState: {
    backgroundColor: '#F6ECDF',
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  emptyStateTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  emptyStateCopy: {
    color: '#64748B',
    lineHeight: 21,
  },
});
