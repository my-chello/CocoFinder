import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { env } from '../../config/env';
import { palette } from '../../config/theme';
import { useVendorData } from '../../hooks/useVendorData';
import type { VendorTabRecord } from '../../types/vendor';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

type CameraRequest = {
  center: { lat: number; lng: number };
  zoom?: number;
  nonce: number;
};

const defaultCenter = {
  latitude: 52.3676,
  longitude: 4.9041,
};

const userMarkerIcon =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="#1D9BF0" stroke="#FFFFFF" stroke-width="4" />
    </svg>
  `);

function getGoogleMaps() {
  if (typeof globalThis === 'undefined' || !('google' in globalThis)) {
    return null;
  }

  return (globalThis as typeof globalThis & {
    google?: typeof google;
  }).google ?? null;
}

function buildVendorMarkerIcon(record: VendorTabRecord) {
  const isCocero = record.vendor.id === 'vendor-cocero';
  const isTruck = record.vendor.id === 'vendor-truck-i-pan-almere';
  const bg = isCocero ? '#ECFDF5' : isTruck ? '#FFF1F2' : '#FFF7ED';
  const border = isCocero ? '#10B981' : isTruck ? '#DC2626' : '#F97316';
  const color = isCocero ? '#047857' : isTruck ? '#991B1B' : '#9A3412';
  const symbol = record.vendor.imageSymbol ?? record.vendor.imageHint;

  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">
        <rect x="3" y="3" width="42" height="42" rx="21" fill="${bg}" stroke="${border}" stroke-width="3"/>
        <text x="24" y="28" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="800" fill="${color}">${symbol}</text>
        <path d="M20 41 L28 41 L24 50 Z" fill="${bg}" stroke="${border}" stroke-width="3" stroke-linejoin="round"/>
      </svg>
    `)
  );
}

function MissingGoogleMapsCard() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.missingCardWrap}>
          <View style={styles.missingCard}>
            <Text style={styles.mapHeroEyebrow}>Google Maps</Text>
            <Text style={styles.missingTitle}>Add your Google Maps API key to enable the web map</Text>
            <Text style={styles.missingCopy}>
              Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to your `.env` file and restart Expo Web. You
              can optionally add `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID` for custom map styling.
            </Text>
            <View style={styles.missingCode}>
              <Text style={styles.missingCodeText}>EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MapCameraController({ request }: { request: CameraRequest | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !request) {
      return;
    }

    map.panTo(request.center);

    if (typeof request.zoom === 'number') {
      map.setZoom(request.zoom);
    }
  }, [map, request]);

  return null;
}

function MapBoundsController({
  shouldFit,
  userCoordinates,
  vendors,
  onDone,
}: {
  shouldFit: boolean;
  userCoordinates: Coordinates | null;
  vendors: VendorTabRecord[];
  onDone: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const googleMaps = getGoogleMaps();

    if (!map || !shouldFit || !googleMaps?.maps) {
      return;
    }

    const bounds = new googleMaps.maps.LatLngBounds();
    let hasPoints = false;

    if (userCoordinates) {
      bounds.extend({ lat: userCoordinates.latitude, lng: userCoordinates.longitude });
      hasPoints = true;
    }

    for (const vendor of vendors) {
      if (!vendor.latestLocation) {
        continue;
      }

      bounds.extend({
        lat: vendor.latestLocation.latitude,
        lng: vendor.latestLocation.longitude,
      });
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(bounds, 80);
    }

    onDone();
  }, [map, onDone, shouldFit, userCoordinates, vendors]);

  return null;
}

function MapLoadingCard({
  title,
  copy,
  actionLabel,
  onAction,
}: {
  title: string;
  copy: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.loadingCardWrap}>
      <View style={styles.loadingCard}>
        <Text style={styles.mapHeroEyebrow}>Google Maps</Text>
        <Text style={styles.loadingTitle}>{title}</Text>
        <Text style={styles.loadingCopy}>{copy}</Text>
        {actionLabel && onAction ? (
          <Pressable style={styles.loadingButton} onPress={onAction}>
            <Text style={styles.loadingButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function MapScreen() {
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [locationPermissionState, setLocationPermissionState] =
    useState<LocationPermissionState>('idle');
  const [locationStatus, setLocationStatus] = useState('Enable location to use nearby discovery on the map.');
  const [mapsStatus, setMapsStatus] = useState('Loading Google Maps...');
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const [mapsReloadKey, setMapsReloadKey] = useState(0);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(null);
  const [shouldFitMap, setShouldFitMap] = useState(true);
  const { vendorTabRecords, reloadVendorData } = useVendorData(userCoordinates);

  const allLiveVendors = useMemo(
    () => vendorTabRecords.filter((record) => record.vendor.liveStatus === 'live'),
    [vendorTabRecords]
  );

  const selectedVendor =
    allLiveVendors.find((record) => record.vendor.id === selectedVendorId) ?? null;

  const liveSummaryText = `${allLiveVendors.length} live vendors on the map`;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationPermissionState('unsupported');
      setLocationStatus('This browser does not support live location');
      return;
    }

    if (typeof navigator.permissions?.query !== 'function') {
      return;
    }

    let isMounted = true;

    void navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((permissionStatus) => {
        if (!isMounted) {
          return;
        }

        if (permissionStatus.state === 'granted') {
          setLocationPermissionState('granted');
          setLocationStatus('Showing your live browser location');
          return;
        }

        if (permissionStatus.state === 'denied') {
          setLocationPermissionState('denied');
          setLocationStatus('Location access is blocked. Enable it in your browser settings to use nearby discovery.');
          return;
        }

        setLocationPermissionState('idle');
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (locationPermissionState !== 'granted' || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setHasUserLocation(true);
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('Showing your live browser location');
      },
      () => {
        setHasUserLocation(false);
        setLocationPermissionState('denied');
        setLocationStatus('Allow browser location access to show your live position');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [locationPermissionState]);

  function requestBrowserLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationPermissionState('unsupported');
      setLocationStatus('This browser does not support live location');
      return;
    }

    setLocationPermissionState('requesting');
    setLocationStatus('Requesting browser location access...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHasUserLocation(true);
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationPermissionState('granted');
        setLocationStatus('Showing your live browser location');
      },
      () => {
        setHasUserLocation(false);
        setLocationPermissionState('denied');
        setLocationStatus('Allow browser location access to show your live position');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }

  useFocusEffect(
    useCallback(() => {
      void reloadVendorData();
    }, [reloadVendorData])
  );

  useEffect(() => {
    if (selectedVendor?.latestLocation) {
      setShouldFitMap(false);
      setCameraRequest({
        center: {
          lat: selectedVendor.latestLocation.latitude,
          lng: selectedVendor.latestLocation.longitude,
        },
        zoom: 15,
        nonce: Date.now(),
      });
    }
  }, [selectedVendor]);

  useEffect(() => {
    if (!hasUserLocation || !userCoordinates) {
      return;
    }

    setCameraRequest((current) =>
      current ?? {
        center: { lat: userCoordinates.latitude, lng: userCoordinates.longitude },
        zoom: 14,
        nonce: Date.now(),
      }
    );
  }, [hasUserLocation, userCoordinates]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const previousAuthFailure = (window as any).gm_authFailure;

    (window as any).gm_authFailure = () => {
      setMapsStatus('Google Maps authentication failed');
      setMapsError('Google rejected this API key. Check billing, API restrictions, and allowed HTTP referrers.');
    };

    return () => {
      (window as any).gm_authFailure = previousAuthFailure;
    };
  }, []);

  useEffect(() => {
    if (isMapsReady || mapsError) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMapsStatus('Google Maps is taking longer than expected');
      setMapsError(
        'The map did not finish loading in time on this mobile web session. Try loading the map again.'
      );
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [isMapsReady, mapsError, mapsReloadKey]);

  if (!env.googleMapsApiKey) {
    return <MissingGoogleMapsCard />;
  }

  return (
    <APIProvider
      key={`google-maps-provider-${mapsReloadKey}`}
      apiKey={env.googleMapsApiKey}
      onLoad={() => {
        setIsMapsReady(true);
        setMapsStatus('Google Maps loaded successfully');
        setMapsError(null);
      }}
      onError={(error) => {
        const message =
          error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
        setIsMapsReady(false);
        setMapsStatus('Google Maps failed to load');
        setMapsError(
          `${message}. Most often this means billing is off, Maps JavaScript API is disabled, or localhost is not allowed in HTTP referrers.`
        );
      }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.mapSurface}>
            {isMapsReady && !mapsError ? (
              <Map
                mapId={env.googleMapsMapId || undefined}
                defaultZoom={13}
                defaultCenter={{ lat: defaultCenter.latitude, lng: defaultCenter.longitude }}
                gestureHandling="greedy"
                disableDefaultUI={false}
                zoomControl
                fullscreenControl={false}
                streetViewControl={false}
                mapTypeControl={false}
                clickableIcons={false}
                style={styles.googleMap}
              >
                <MapCameraController request={cameraRequest} />
                <MapBoundsController
                  shouldFit={shouldFitMap}
                  userCoordinates={userCoordinates}
                  vendors={allLiveVendors}
                  onDone={() => setShouldFitMap(false)}
                />
                {hasUserLocation && userCoordinates ? (
                  <Marker
                    position={{ lat: userCoordinates.latitude, lng: userCoordinates.longitude }}
                    icon={{
                      url: userMarkerIcon,
                      scaledSize: getGoogleMaps()?.maps
                        ? new (getGoogleMaps()!.maps.Size)(26, 26)
                        : undefined,
                    }}
                    title="You are here"
                  />
                ) : null}

                {allLiveVendors.map((record) =>
                  record.latestLocation ? (
                    <Marker
                      key={`${record.vendor.id}-${record.latestLocation.recordedAt}`}
                      position={{
                        lat: record.latestLocation.latitude,
                        lng: record.latestLocation.longitude,
                      }}
                      title={record.vendor.businessName}
                      icon={{
                        url: buildVendorMarkerIcon(record),
                      }}
                      onClick={() => setSelectedVendorId(record.vendor.id)}
                    />
                  ) : null
                )}

                {selectedVendor?.latestLocation ? (
                  <InfoWindow
                    position={{
                      lat: selectedVendor.latestLocation.latitude,
                      lng: selectedVendor.latestLocation.longitude,
                    }}
                    onCloseClick={() => setSelectedVendorId(null)}
                  >
                    <div style={{ maxWidth: 220 }}>
                      <strong>{selectedVendor.vendor.businessName}</strong>
                      <br />
                      {selectedVendor.vendor.category} · {selectedVendor.vendor.distanceKm} km away
                    </div>
                  </InfoWindow>
                ) : null}
              </Map>
            ) : (
              <MapLoadingCard
                title={mapsError ? 'Map load paused' : 'Loading map'}
                copy={
                  mapsError
                    ? mapsError
                    : 'We are preparing Google Maps for this mobile web session so the tab opens safely instead of showing a white screen.'
                }
                actionLabel="Try again"
                onAction={() => {
                  setMapsError(null);
                  setMapsStatus('Loading Google Maps...');
                  setIsMapsReady(false);
                  setMapsReloadKey((current) => current + 1);
                }}
              />
            )}

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
                  Google Maps is now used on web. Track live vendors and jump straight into the best stop nearby.
                </Text>
              </View>

              <View style={styles.filterFeedbackCard}>
                <Text style={styles.filterFeedbackText}>{liveSummaryText}</Text>
                <Text style={styles.filterFeedbackHelper}>{locationStatus}</Text>
                <Text style={styles.filterFeedbackHelper}>{mapsStatus}</Text>
                {mapsError ? <Text style={styles.filterFeedbackError}>{mapsError}</Text> : null}
                {locationPermissionState !== 'granted' ? (
                  <Pressable
                    style={[
                      styles.locationActionButton,
                      locationPermissionState === 'requesting' && styles.locationActionButtonDisabled,
                    ]}
                    disabled={locationPermissionState === 'requesting'}
                    onPress={requestBrowserLocation}
                  >
                    <Text style={styles.locationActionButtonText}>
                      {locationPermissionState === 'denied'
                        ? 'Try location again'
                        : locationPermissionState === 'requesting'
                          ? 'Requesting location...'
                          : 'Use my location'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[styles.floatingLocateButton, !hasUserLocation && styles.floatingLocateButtonDisabled]}
              disabled={!hasUserLocation || !userCoordinates}
              onPress={() => {
                if (!userCoordinates) {
                  return;
                }

                setShouldFitMap(false);
                setCameraRequest({
                  center: { lat: userCoordinates.latitude, lng: userCoordinates.longitude },
                  zoom: 15,
                  nonce: Date.now(),
                });
              }}
            >
              <Text style={styles.floatingLocateIcon}>◎</Text>
              <Text style={styles.floatingLocateText}>My location</Text>
            </Pressable>

            {selectedVendor ? (
              <View style={[styles.previewCard, { bottom: tabBarHeight + 32 }]}>
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
                    onPress={() => {
                      if (!selectedVendor.latestLocation || typeof window === 'undefined') {
                        return;
                      }

                      const destination = `${selectedVendor.latestLocation.latitude},${selectedVendor.latestLocation.longitude}`;
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Text style={styles.previewButtonSecondaryText}>Directions</Text>
                  </Pressable>
                  <Pressable
                    style={styles.previewButtonGhost}
                    onPress={() => setSelectedVendorId(null)}
                  >
                    <Text style={styles.previewButtonGhostText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </APIProvider>
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
  googleMap: {
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    zIndex: 3,
    gap: 10,
    pointerEvents: 'box-none',
  },
  mapHeroCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(246, 236, 223, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
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
    fontSize: 24,
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
    marginTop: 8,
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
  },
  floatingLocateButton: {
    position: 'absolute',
    right: 20,
    bottom: 140,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  floatingLocateButtonDisabled: {
    backgroundColor: 'rgba(226,232,240,0.95)',
  },
  floatingLocateIcon: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  floatingLocateText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  filterFeedbackCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(8, 18, 29, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  filterFeedbackError: {
    color: '#FECACA',
    fontSize: 11,
    lineHeight: 16,
  },
  locationActionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationActionButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  locationActionButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  previewCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 3,
    backgroundColor: 'rgba(246, 236, 223, 0.94)',
    borderRadius: 26,
    padding: 16,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 7,
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
    fontSize: 21,
    fontWeight: '900',
  },
  previewMeta: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
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
    fontSize: 13,
    lineHeight: 19,
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
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },
  previewButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewButtonGhost: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
  },
  previewButtonGhostText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  missingCardWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  loadingCardWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(246, 236, 223, 0.96)',
    padding: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  loadingTitle: {
    color: '#111827',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  loadingCopy: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  loadingButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  missingCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(246, 236, 223, 0.96)',
    padding: 20,
    gap: 12,
  },
  missingTitle: {
    color: '#111827',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  missingCopy: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  missingCode: {
    borderRadius: 16,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  missingCodeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});
