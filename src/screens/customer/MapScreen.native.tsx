import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { palette } from '../../config/theme';
import { useVendorData } from '../../hooks/useVendorData';
import type { VendorTabRecord } from '../../types/vendor';
const distanceOptions = [500, 1000, 2000] as const;
type DistanceOption = (typeof distanceOptions)[number];

const defaultRegion: Region = {
  latitude: 52.3676,
  longitude: 4.9041,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

function distanceLabel(distanceMeters: DistanceOption) {
  return distanceMeters >= 1000 ? `${distanceMeters / 1000} km` : `${distanceMeters} m`;
}

function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6371000;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function MapScreen() {
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeDistanceMeters, setActiveDistanceMeters] = useState<DistanceOption | null>(null);
  const [pendingDistanceMeters, setPendingDistanceMeters] = useState<DistanceOption | null>(null);
  const { vendorTabRecords, reloadVendorData } = useVendorData(userCoordinates);
  const allLiveVendors = vendorTabRecords.filter((record) => record.vendor.liveStatus === 'live');
  const defaultNearbyLiveVendors = allLiveVendors.filter(
    (record) => record.vendor.liveStatus === 'live' && record.vendor.distanceKm <= 2
  );
  const prioritizedDistanceVendors =
    activeDistanceMeters && userCoordinates
      ? allLiveVendors.filter((record) => {
          if (!record.latestLocation) {
            return false;
          }

          return (
            getDistanceMeters(userCoordinates, {
              latitude: record.latestLocation.latitude,
              longitude: record.latestLocation.longitude,
            }) <= activeDistanceMeters
          );
        })
      : defaultNearbyLiveVendors;
  const visibleVendors = allLiveVendors;
  const prioritizedVendorIds = new Set(prioritizedDistanceVendors.map((record) => record.vendor.id));
  const selectedVendor =
    visibleVendors.find((record) => record.vendor.id === selectedVendorId) ??
    null;
  const pendingPrioritizedVendors =
    pendingDistanceMeters && userCoordinates
      ? allLiveVendors.filter((record) => {
          if (!record.latestLocation) {
            return false;
          }

          return (
            getDistanceMeters(userCoordinates, {
              latitude: record.latestLocation.latitude,
              longitude: record.latestLocation.longitude,
            }) <= pendingDistanceMeters
          );
        })
      : defaultNearbyLiveVendors;
  const coceroVendorId = 'vendor-cocero';
  const truckIPanVendorId = 'vendor-truck-i-pan-almere';
  const bottomOverlayOffset = tabBarHeight + Math.max(insets.bottom, 12) + 20;
  const hasActiveDistancePriority = Boolean(activeDistanceMeters && userCoordinates);
  const prioritizedSummaryText = activeDistanceMeters
    ? hasUserLocation && userCoordinates
      ? `${prioritizedDistanceVendors.length} nearby vendors within ${distanceLabel(activeDistanceMeters)}`
      : 'Enable location to use distance filter accurately'
    : `${allLiveVendors.length} live vendors on the map`;

  function openFilterSheet() {
    setPendingDistanceMeters(activeDistanceMeters);
    setIsFilterSheetOpen(true);
  }

  function applyFilters() {
    setActiveDistanceMeters(pendingDistanceMeters);
    setSelectedVendorId(null);
    setIsFilterSheetOpen(false);
  }

  function resetFilters() {
    setPendingDistanceMeters(null);
    setActiveDistanceMeters(null);
    setSelectedVendorId(null);
    setIsFilterSheetOpen(false);
  }

  function updateCenteredState(nextRegion: Region) {
    if (!userCoordinates) {
      setIsCenteredOnUser(true);
      return;
    }

    const distanceFromUser = getDistanceMeters(userCoordinates, {
      latitude: nextRegion.latitude,
      longitude: nextRegion.longitude,
    });
    setIsCenteredOnUser(distanceFromUser <= 60);
  }

  async function recenterMap() {
    if (!userCoordinates) {
      return;
    }

    const nextRegion: Region = {
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    mapRef.current?.animateToRegion(nextRegion, 300);
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: userCoordinates.latitude,
          longitude: userCoordinates.longitude,
        },
        pitch: 0,
        heading: 0,
        zoom: 16,
      },
      { duration: 300 }
    );
    setRegion(nextRegion);
    setIsCenteredOnUser(true);
  }

  async function loadLocation(isMountedRef?: { current: boolean }) {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (isMountedRef && !isMountedRef.current) {
        return;
      }

      if (permission.status !== 'granted') {
        setRegion(defaultRegion);
        setHasUserLocation(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (isMountedRef && !isMountedRef.current) {
        return;
      }

      const nextRegion: Region = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setRegion(nextRegion);
      setHasUserLocation(true);
      setUserCoordinates({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setIsCenteredOnUser(true);
    } catch {
      if (isMountedRef && !isMountedRef.current) {
        return;
      }

      setRegion(defaultRegion);
      setHasUserLocation(false);
      setUserCoordinates(null);
      setIsCenteredOnUser(true);
    }
  }

  useEffect(() => {
    const isMountedRef = { current: true };

    void loadLocation(isMountedRef);

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadVendorData();
    }, [reloadVendorData])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.mapSurface}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            region={region}
            showsCompass={false}
            showsUserLocation={hasUserLocation}
            showsMyLocationButton={false}
            followsUserLocation={false}
            onRegionChangeComplete={(nextRegion) => {
              setRegion(nextRegion);
              updateCenteredState(nextRegion);
            }}
          >
            {hasUserLocation && userCoordinates && activeDistanceMeters ? (
              <Circle
                center={userCoordinates}
                radius={activeDistanceMeters}
                fillColor="rgba(126,224,183,0.14)"
                strokeColor="rgba(126,224,183,0.55)"
                strokeWidth={2}
              />
            ) : null}
            {visibleVendors.map((record) =>
              record.latestLocation ? (
                <Marker
                  key={record.vendor.id}
                  coordinate={{
                    latitude: record.latestLocation.latitude,
                    longitude: record.latestLocation.longitude,
                  }}
                  title={record.vendor.businessName}
                  description={`${record.vendor.category} · ${record.vendor.distanceKm} km away`}
                    onPress={() => setSelectedVendorId(record.vendor.id)}
                >
                  <View style={styles.vendorMarkerWrap}>
                    <View
                      style={[
                        styles.vendorMarker,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          styles.vendorMarkerOutsideRange,
                        record.vendor.id === coceroVendorId && styles.vendorMarkerCocero,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          record.vendor.id === coceroVendorId &&
                          styles.vendorMarkerCoceroOutsideRange,
                        record.vendor.id === truckIPanVendorId && styles.vendorMarkerTruck,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          record.vendor.id === truckIPanVendorId &&
                          styles.vendorMarkerTruckOutsideRange,
                      ]}
                    >
                      <Text
                        style={[
                          styles.vendorMarkerText,
                          hasActiveDistancePriority &&
                            !prioritizedVendorIds.has(record.vendor.id) &&
                            styles.vendorMarkerTextOutsideRange,
                          record.vendor.id === coceroVendorId && styles.vendorMarkerTextCocero,
                          hasActiveDistancePriority &&
                            !prioritizedVendorIds.has(record.vendor.id) &&
                            record.vendor.id === coceroVendorId &&
                            styles.vendorMarkerTextCoceroOutsideRange,
                          record.vendor.id === truckIPanVendorId &&
                            styles.vendorMarkerTextTruck,
                          hasActiveDistancePriority &&
                            !prioritizedVendorIds.has(record.vendor.id) &&
                            record.vendor.id === truckIPanVendorId &&
                            styles.vendorMarkerTextTruckOutsideRange,
                        ]}
                      >
                        {record.vendor.imageSymbol ?? record.vendor.imageHint}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.vendorMarkerPointer,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          styles.vendorMarkerPointerOutsideRange,
                        record.vendor.id === coceroVendorId && styles.vendorMarkerPointerCocero,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          record.vendor.id === coceroVendorId &&
                          styles.vendorMarkerPointerCoceroOutsideRange,
                        record.vendor.id === truckIPanVendorId &&
                          styles.vendorMarkerPointerTruck,
                        hasActiveDistancePriority &&
                          !prioritizedVendorIds.has(record.vendor.id) &&
                          record.vendor.id === truckIPanVendorId &&
                          styles.vendorMarkerPointerTruckOutsideRange,
                      ]}
                    />
                  </View>
                </Marker>
              ) : null
            )}
          </MapView>

          <View style={styles.topOverlay}>
            <View style={styles.mapHeroCard}>
              <View style={styles.mapHeroTop}>
                <View>
                  <Text style={styles.mapHeroEyebrow}>Live discovery</Text>
                  <Text style={styles.mapHeroTitle}>Find it nearby</Text>
                </View>
                <View style={styles.mapHeroBadge}>
                  <Text style={styles.mapHeroBadgeText}>{allLiveVendors.length} live</Text>
                </View>
              </View>
              <Text style={styles.mapHeroCopy}>
                Track live vendors, filter faster, and jump straight into the best stop nearby.
              </Text>
            </View>

            <Pressable
              style={[
                styles.filterBox,
                activeDistanceMeters && styles.filterBoxActive,
              ]}
              onPress={openFilterSheet}
            >
              <View style={styles.filterBoxIconWrap}>
                <Text
                  style={[
                    styles.filterBoxIcon,
                    activeDistanceMeters && styles.filterBoxIconActive,
                  ]}
                >
                  📍
                </Text>
              </View>
              <View style={styles.filterBoxBody}>
                <Text
                  style={[
                    styles.filterBoxLabel,
                    activeDistanceMeters && styles.filterBoxLabelActive,
                  ]}
                >
                  Distance filter
                </Text>
                <Text
                  style={[
                    styles.filterBoxValue,
                    activeDistanceMeters && styles.filterBoxValueActive,
                  ]}
                >
                  {activeDistanceMeters
                    ? `Distance: ${distanceLabel(activeDistanceMeters)}`
                    : 'Filter by distance'}
                </Text>
              </View>
              <Text
                style={[
                  styles.filterBoxChevron,
                  activeDistanceMeters && styles.filterBoxChevronActive,
                ]}
              >
                ▾
              </Text>
            </Pressable>

            {activeDistanceMeters ? (
              <View style={styles.filterMetaRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeFilterChips}
                  style={styles.activeFilterScroll}
                >
                  <Pressable
                    style={styles.activeFilterChip}
                    onPress={() => {
                      setActiveDistanceMeters(null);
                      setPendingDistanceMeters(null);
                      setSelectedVendorId(null);
                    }}
                  >
                    <Text style={styles.activeFilterChipText}>{distanceLabel(activeDistanceMeters)}</Text>
                    <Text style={styles.activeFilterChipClose}>×</Text>
                  </Pressable>
                </ScrollView>

                <View style={styles.filterFeedbackCard}>
                  <Text style={styles.filterFeedbackText}>{prioritizedSummaryText}</Text>
                  {!hasUserLocation ? (
                    <Text style={styles.filterFeedbackHelper}>
                      Enable location to use distance filter accurately
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          {activeDistanceMeters && prioritizedDistanceVendors.length === 0 ? (
            <View style={styles.radiusEmptyState}>
              <Text style={styles.radiusEmptyTitle}>No vendors are inside this distance yet</Text>
              <Text style={styles.radiusEmptyCopy}>
                All vendors stay visible on the map. Try widening the distance filter to prioritize more nearby stops.
              </Text>
            </View>
          ) : null}

          {selectedVendor ? (
            <View style={[styles.previewCard, { bottom: bottomOverlayOffset }]}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIdentity}>
                  <View style={styles.previewMiniMeta}>
                    <Text style={styles.previewMiniMetaText}>
                      {selectedVendor.vendor.imageSymbol ?? selectedVendor.vendor.imageHint}
                    </Text>
                    <Text style={styles.previewMiniMetaDivider}>•</Text>
                    <Text style={styles.previewMiniMetaText}>{selectedVendor.vendor.category}</Text>
                  </View>
                  <Text style={styles.previewName}>{selectedVendor.vendor.businessName}</Text>
                  <Text style={styles.previewMeta}>
                    {selectedVendor.vendor.category} · {selectedVendor.vendor.distanceKm} km away
                  </Text>
                </View>
                <View style={styles.previewLiveBadge}>
                  <Text style={styles.previewLiveText}>LIVE</Text>
                </View>
              </View>

              <Text style={styles.previewCopy}>{selectedVendor.vendor.description}</Text>

              <View style={styles.previewInfoRow}>
                <View style={styles.previewInfoPill}>
                  <Text style={styles.previewInfoPillText}>{selectedVendor.vendor.operatingHours}</Text>
                </View>
                <View style={styles.previewInfoPill}>
                  <Text style={styles.previewInfoPillText}>{selectedVendor.vendor.priceHint}</Text>
                </View>
              </View>

              <View style={styles.previewActions}>
                <Pressable
                  style={styles.previewButtonPrimary}
                  onPress={() =>
                    navigation.navigate('Vendors', {
                      screen: 'VendorDetail',
                      params: { vendorId: selectedVendor.vendor.id },
                    })
                  }
                >
                  <Text style={styles.previewButtonPrimaryText}>Open profile</Text>
                </Pressable>
                <Pressable
                  style={styles.previewButtonSecondary}
                  onPress={() => setSelectedVendorId(null)}
                >
                  <Text style={styles.previewButtonSecondaryText}>Close</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {isFilterSheetOpen ? (
            <View style={styles.sheetOverlay}>
              <Pressable style={styles.sheetBackdrop} onPress={() => setIsFilterSheetOpen(false)} />
              <View
                style={[
                  styles.sheet,
                  { paddingBottom: tabBarHeight + Math.max(insets.bottom, 12) },
                ]}
              >
                <View style={styles.sheetHandle} />
                <ScrollView
                  style={styles.sheetContentScroll}
                  contentContainerStyle={styles.sheetContentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sheetTitle}>Distance</Text>
                  <Text style={styles.sheetCopy}>
                    Choose how far away vendors can be to appear on the map.
                  </Text>

                  <View style={styles.sheetSection}>
                    <Text style={styles.sheetSectionTitle}>Distance</Text>
                    <View style={styles.sheetChipWrap}>
                      {distanceOptions.map((distanceOption) => {
                        const isSelected = pendingDistanceMeters === distanceOption;

                        return (
                          <Pressable
                            key={distanceOption}
                            style={[styles.sheetChip, isSelected && styles.sheetChipSelected]}
                            onPress={() =>
                              setPendingDistanceMeters((current) =>
                                current === distanceOption ? null : distanceOption
                              )
                            }
                          >
                            <View style={styles.sheetChipInner}>
                              <Text style={styles.sheetChipIcon}>📍</Text>
                              <Text
                                style={[
                                  styles.sheetChipText,
                                  isSelected && styles.sheetChipTextSelected,
                                ]}
                              >
                                {distanceLabel(distanceOption)}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!hasUserLocation ? (
                      <Text style={styles.sheetHelperText}>
                        Give location permission to use distance filters and map radius.
                      </Text>
                    ) : null}
                  </View>
                </ScrollView>

                <View style={styles.sheetActions}>
                  <Pressable style={styles.sheetResetButton} onPress={resetFilters}>
                    <Text style={styles.sheetResetText}>Reset</Text>
                  </Pressable>
                  <Pressable style={styles.sheetApplyButton} onPress={applyFilters}>
                    <Text style={styles.sheetApplyText}>
                      Apply ({pendingPrioritizedVendors.length})
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  container: {
    flex: 1,
    backgroundColor: '#09121E',
  },
  mapSurface: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#08121D',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    zIndex: 3,
    gap: 12,
  },
  mapHeroCard: {
    backgroundColor: 'rgba(246, 236, 223, 0.95)',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  mapHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  mapHeroEyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mapHeroTitle: {
    marginTop: 4,
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  mapHeroBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapHeroBadgeText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
  },
  mapHeroCopy: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  vendorMarkerWrap: {
    alignItems: 'center',
  },
  vendorMarker: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  vendorMarkerText: {
    color: '#9A3412',
    fontSize: 18,
    fontWeight: '800',
  },
  vendorMarkerCocero: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  vendorMarkerOutsideRange: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.72,
  },
  vendorMarkerCoceroOutsideRange: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  vendorMarkerTextCocero: {
    color: '#047857',
  },
  vendorMarkerTextOutsideRange: {
    color: '#64748B',
  },
  vendorMarkerTextCoceroOutsideRange: {
    color: '#059669',
  },
  vendorMarkerTruck: {
    backgroundColor: '#FFF1F2',
    borderColor: '#DC2626',
  },
  vendorMarkerTruckOutsideRange: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  vendorMarkerTextTruck: {
    color: '#991B1B',
  },
  vendorMarkerTextTruckOutsideRange: {
    color: '#B91C1C',
  },
  vendorMarkerPointer: {
    marginTop: -1,
    width: 12,
    height: 12,
    backgroundColor: '#FFF7ED',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#F97316',
    transform: [{ rotate: '45deg' }],
  },
  vendorMarkerPointerOutsideRange: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  vendorMarkerPointerCocero: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  vendorMarkerPointerCoceroOutsideRange: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  vendorMarkerPointerTruck: {
    backgroundColor: '#FFF1F2',
    borderColor: '#DC2626',
  },
  vendorMarkerPointerTruckOutsideRange: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  filterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  filterBoxActive: {
    backgroundColor: '#111827',
  },
  filterBoxIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBoxIcon: {
    color: '#475569',
    fontSize: 16,
  },
  filterBoxIconActive: {
    color: '#F8FAFC',
  },
  filterBoxBody: {
    flex: 1,
    gap: 2,
  },
  filterBoxLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  filterBoxLabelActive: {
    color: '#CBD5E1',
  },
  filterBoxValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  filterBoxValueActive: {
    color: '#F8FAFC',
  },
  filterBoxChevron: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '900',
  },
  filterBoxChevronActive: {
    color: '#F8FAFC',
  },
  filterMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activeFilterScroll: {
    flexGrow: 0,
    maxWidth: '42%',
  },
  activeFilterChips: {
    gap: 8,
    paddingRight: 4,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activeFilterChipText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  activeFilterChipClose: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '900',
  },
  filterFeedbackCard: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 29, 0.42)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
  },
  filterFeedbackText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  filterFeedbackHelper: {
    color: '#C7D2E2',
    fontSize: 11,
    lineHeight: 16,
  },
  radiusEmptyState: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    padding: 18,
  },
  radiusEmptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  radiusEmptyCopy: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
  },
  previewCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    zIndex: 3,
    backgroundColor: 'rgba(246, 236, 223, 0.97)',
    borderRadius: 30,
    padding: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewIdentity: {
    flex: 1,
  },
  previewMiniMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewMiniMetaText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewMiniMetaDivider: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  previewName: {
    color: '#111827',
    fontSize: 23,
    fontWeight: '900',
  },
  previewMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  previewLiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewLiveText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  previewCopy: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  previewInfoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewInfoPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewInfoPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewButtonPrimary: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  previewButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },
  previewButtonSecondaryText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 8, 18, 0.48)',
  },
  sheet: {
    backgroundColor: '#FFFDF8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '78%',
    gap: 16,
  },
  sheetContentScroll: {
    flexGrow: 0,
  },
  sheetContentContainer: {
    gap: 16,
    paddingBottom: 4,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },
  sheetCopy: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  sheetSection: {
    gap: 10,
  },
  sheetSectionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  sheetChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetHelperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  sheetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5D7C1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  sheetChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetChipIcon: {
    fontSize: 15,
  },
  sheetChipSelected: {
    backgroundColor: '#FFF1E8',
    borderColor: '#F97316',
  },
  sheetChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  sheetChipTextSelected: {
    color: '#C2410C',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetResetButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#F1ECE3',
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetResetText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetApplyButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetApplyText: {
    color: palette.cloud,
    fontSize: 13,
    fontWeight: '800',
  },
});
