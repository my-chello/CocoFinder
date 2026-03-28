import { useCallback, useEffect, useMemo, useState } from 'react';
import { vendorTabRecords as baseVendorTabRecords, vendors as baseVendors } from '../data/mockVendors';
import {
  getVendorLiveState,
  getVendorProfile,
  type VendorLiveState,
  type VendorProfileSetup,
} from '../lib/vendorProfile';
import { formatPriceForCountry } from '../lib/currency';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';
import { parseVendorOpeningHoursValue } from '../lib/vendorOpeningHours';
import type { Vendor, VendorTabRecord } from '../types/vendor';

const EDITABLE_VENDOR_ID = 'vendor-cocero';
const DEFAULT_DISCOVERY_DISTANCE_KM = 0.5;
type UserCoordinates = {
  latitude: number;
  longitude: number;
} | null;

type SupabaseVendorProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  logo_symbol: string | null;
  category: string | null;
  country: string | null;
  phone: string | null;
  opening_hours: string | null;
  about: string | null;
  is_live: boolean | null;
  live_latitude: number | null;
  live_longitude: number | null;
  live_updated_at: string | null;
};

type SupabaseVendorProductRow = {
  id: string;
  user_id: string;
  name: string;
  price_label: string;
  is_available: boolean;
  image_symbol: string | null;
  sort_order: number;
};

type DemoVendorProfileRow = {
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
  live_latitude: number | null;
  live_longitude: number | null;
  live_updated_at: string | null;
  rating: number | null;
  price_hint: string | null;
  next_area: string | null;
  tags: string[] | null;
};

type DemoVendorProductRow = {
  id: string;
  vendor_id: string;
  name: string;
  price_label: string;
  is_available: boolean;
  image_symbol: string | null;
  sort_order: number;
};

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

function formatRecordedAt(value: string | null) {
  if (!value) {
    return 'No update';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} hr ago`;
}

function mapSupabaseVendorRowsToRecords(
  profileRows: SupabaseVendorProfileRow[],
  productRows: SupabaseVendorProductRow[]
): VendorTabRecord[] {
  return profileRows
    .filter((profileRow) => profileRow.business_name && profileRow.category)
    .map((profileRow) => {
      const vendorId = `supabase-vendor-${profileRow.user_id}`;
      const matchingProducts = productRows
        .filter((product) => product.user_id === profileRow.user_id)
        .sort((left, right) => left.sort_order - right.sort_order);
      const businessName = profileRow.business_name ?? 'Vendor';
      const category = profileRow.category ?? 'Other';
      const country = profileRow.country ?? 'Netherlands';
      const parsedOpeningHours = parseVendorOpeningHoursValue(profileRow.opening_hours);
      const ownerName = [profileRow.first_name, profileRow.last_name].filter(Boolean).join(' ').trim();
      const priceHint =
        matchingProducts[0]?.price_label
          ? formatPriceForCountry(country, matchingProducts[0].price_label)
          : formatPriceForCountry(country, '5');
      const latestLocation =
        typeof profileRow.live_latitude === 'number' &&
        typeof profileRow.live_longitude === 'number' &&
        profileRow.live_updated_at
          ? {
              id: `supabase-location-${profileRow.user_id}`,
              vendorId,
              latitude: profileRow.live_latitude,
              longitude: profileRow.live_longitude,
              recordedAt: formatRecordedAt(profileRow.live_updated_at),
            }
          : null;

      return {
        vendor: {
          id: vendorId,
          userId: profileRow.user_id,
          businessName,
          description: profileRow.about ?? 'No description yet.',
          category,
          imageHint: buildImageHint(businessName),
          imageSymbol: profileRow.logo_symbol ?? undefined,
          operatingHours: parsedOpeningHours.summary || 'Hours not set',
          phone: profileRow.phone ?? 'No phone',
          status: 'active',
          isOpen: Boolean(profileRow.is_live),
          rating: 4.8,
          distanceKm: DEFAULT_DISCOVERY_DISTANCE_KM,
          priceHint,
          liveStatus: profileRow.is_live ? 'live' : 'offline',
          eta: profileRow.is_live ? 'Live now' : 'Offline',
          nextArea: country,
          tags: [
            category,
            country,
            ...matchingProducts.map((product) => product.name),
          ],
        },
        owner: {
          id: profileRow.user_id,
          email: '',
          fullName: ownerName || businessName,
          role: 'vendor',
        },
        latestLocation,
        products: matchingProducts.map((product, index) => ({
          id: product.id,
          vendorId,
          name: product.name,
          description: profileRow.about ?? 'Freshly updated by the vendor.',
          price: index + 1,
          priceLabel: formatPriceForCountry(country, product.price_label),
          isAvailable: product.is_available,
          imageSymbol: product.image_symbol ?? undefined,
        })),
        isFavorite: false,
        favoriteCount: 0,
      };
    });
}

function mapDemoVendorRowsToRecords(
  profileRows: DemoVendorProfileRow[],
  productRows: DemoVendorProductRow[]
): VendorTabRecord[] {
  return profileRows
    .filter((profileRow) => profileRow.business_name && profileRow.category)
    .map((profileRow) => {
      const matchingProducts = productRows
        .filter((product) => product.vendor_id === profileRow.id)
        .sort((left, right) => left.sort_order - right.sort_order);
      const businessName = profileRow.business_name ?? 'Vendor';
      const category = profileRow.category ?? 'Other';
      const country = profileRow.country ?? 'Netherlands';
      const parsedOpeningHours = parseVendorOpeningHoursValue(profileRow.opening_hours);
      const priceHint =
        profileRow.price_hint ??
        (matchingProducts[0]?.price_label
          ? formatPriceForCountry(country, matchingProducts[0].price_label)
          : formatPriceForCountry(country, '5'));
      const latestLocation =
        typeof profileRow.live_latitude === 'number' &&
        typeof profileRow.live_longitude === 'number' &&
        profileRow.live_updated_at
          ? {
              id: `demo-location-${profileRow.id}`,
              vendorId: profileRow.id,
              latitude: profileRow.live_latitude,
              longitude: profileRow.live_longitude,
              recordedAt: formatRecordedAt(profileRow.live_updated_at),
            }
          : null;

      return {
        vendor: {
          id: profileRow.id,
          userId: `demo-${profileRow.id}`,
          businessName,
          description: profileRow.about ?? 'No description yet.',
          category,
          imageHint: buildImageHint(businessName),
          imageSymbol: profileRow.logo_symbol ?? undefined,
          operatingHours: parsedOpeningHours.summary || 'Hours not set',
          phone: profileRow.phone ?? 'No phone',
          status: 'active',
          isOpen: Boolean(profileRow.is_live),
          rating: profileRow.rating ?? 4.8,
          distanceKm: DEFAULT_DISCOVERY_DISTANCE_KM,
          priceHint,
          liveStatus: profileRow.is_live ? 'live' : 'offline',
          eta: profileRow.is_live ? 'Live now' : 'Offline',
          nextArea: profileRow.next_area ?? country,
          tags: profileRow.tags ?? [category, country, ...matchingProducts.map((product) => product.name)],
        },
        owner: {
          id: `demo-owner-${profileRow.id}`,
          email: '',
          fullName: profileRow.owner_name ?? businessName,
          role: 'vendor',
        },
        latestLocation,
        products: matchingProducts.map((product, index) => ({
          id: product.id,
          vendorId: profileRow.id,
          name: product.name,
          description: profileRow.about ?? 'Freshly updated by the vendor.',
          price: index + 1,
          priceLabel: formatPriceForCountry(country, product.price_label),
          isAvailable: product.is_available,
          imageSymbol: product.image_symbol ?? undefined,
        })),
        isFavorite: false,
        favoriteCount: 0,
      };
    });
}

function getDistanceKm(from: NonNullable<UserCoordinates>, to: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function applyUserDistanceToRecords(records: VendorTabRecord[], userCoordinates: UserCoordinates) {
  if (!userCoordinates) {
    return records;
  }

  return records.map((record) => {
    if (!record.latestLocation) {
      return record;
    }

    const distanceKm = Number(
      getDistanceKm(userCoordinates, {
        latitude: record.latestLocation.latitude,
        longitude: record.latestLocation.longitude,
      }).toFixed(1)
    );

    return {
      ...record,
      vendor: {
        ...record.vendor,
        distanceKm,
      },
    };
  });
}

function recordToVendor(record: VendorTabRecord): Vendor {
  return {
    id: record.vendor.id,
    name: record.vendor.businessName,
    category: record.vendor.category,
    description: record.vendor.description,
    distanceKm: record.vendor.distanceKm,
    isOpen: record.vendor.isOpen,
    rating: record.vendor.rating,
    lastUpdated: record.latestLocation?.recordedAt ?? 'No update',
    priceHint: record.vendor.priceHint,
    tags: record.vendor.tags,
    eta: record.vendor.eta,
    liveStatus: record.vendor.liveStatus,
    nextArea: record.vendor.nextArea,
    menu: record.products.map((product) => ({
      id: product.id,
      name: product.name,
      priceLabel: product.priceLabel,
    })),
  };
}

function mergeDiscoveryRecords(
  baseRecords: VendorTabRecord[],
  publicRecords: VendorTabRecord[]
) {
  const mergedByBusiness = new Map<string, VendorTabRecord>();

  for (const record of baseRecords) {
    mergedByBusiness.set(record.vendor.businessName.trim().toLowerCase(), record);
  }

  for (const record of publicRecords) {
    mergedByBusiness.set(record.vendor.businessName.trim().toLowerCase(), record);
  }

  return Array.from(mergedByBusiness.values());
}

function mergeVendorProfileIntoRecords(
  records: VendorTabRecord[],
  profile: VendorProfileSetup | null,
  liveState: VendorLiveState
): VendorTabRecord[] {
  return records.map((record) => {
    if (record.vendor.id !== EDITABLE_VENDOR_ID) {
      return record;
    }

    const mergedProducts = profile
      ? (profile.products ?? []).map((product, index) => ({
          id: `product-vendor-setup-${product.id}`,
          vendorId: record.vendor.id,
          name: product.name,
          description: profile.about,
          price: index + 1,
          priceLabel: formatPriceForCountry(profile.country, product.priceLabel),
          isAvailable: product.isAvailable,
          imageSymbol: product.imageSymbol,
        }))
      : record.products;

    return {
      ...record,
      vendor: {
        ...record.vendor,
        businessName: profile?.businessName ?? record.vendor.businessName,
        imageSymbol: profile?.logoSymbol ?? record.vendor.imageSymbol,
        category: profile?.category ?? record.vendor.category,
        description: profile?.about ?? record.vendor.description,
        operatingHours: profile?.openingHours ?? record.vendor.operatingHours,
        phone: profile?.phone ?? record.vendor.phone,
        tags: profile
          ? [profile.category, ...(profile.products ?? []).map((product) => product.name), 'Vendor Setup']
          : record.vendor.tags,
        priceHint: profile?.products?.[0]
          ? formatPriceForCountry(profile.country, profile.products[0].priceLabel)
          : record.vendor.priceHint,
        liveStatus: liveState.isLive ? 'live' : 'offline',
        isOpen: liveState.isLive,
        eta: liveState.isLive ? 'Live now' : 'Offline',
      },
      latestLocation: liveState.location
        ? {
            id: 'location-vendor-setup-live',
            vendorId: record.vendor.id,
            latitude: liveState.location.latitude,
            longitude: liveState.location.longitude,
            recordedAt: liveState.location.updatedAt,
          }
        : record.latestLocation,
      products: mergedProducts,
    };
  });
}

function mergeVendorProfileIntoVendors(
  vendors: Vendor[],
  profile: VendorProfileSetup | null,
  liveState: VendorLiveState
): Vendor[] {
  return vendors.map((vendor) => {
    if (vendor.id !== EDITABLE_VENDOR_ID) {
      return vendor;
    }

    return {
      ...vendor,
      name: profile?.businessName ?? vendor.name,
      category: profile?.category ?? vendor.category,
      description: profile?.about ?? vendor.description,
      liveStatus: liveState.isLive ? 'live' : 'offline',
      isOpen: liveState.isLive,
      eta: liveState.isLive ? 'Live now' : 'Offline',
      priceHint: profile?.products?.[0]
        ? formatPriceForCountry(profile.country, profile.products[0].priceLabel)
        : vendor.priceHint,
      menu: profile
        ? (profile.products ?? []).map((product) => ({
            id: `menu-vendor-setup-${product.id}`,
            name: product.name,
            priceLabel: formatPriceForCountry(profile.country, product.priceLabel),
          }))
        : vendor.menu,
    };
  });
}

export function useVendorData(userCoordinates: UserCoordinates = null) {
  const [vendorProfile, setVendorProfile] = useState<VendorProfileSetup | null>(null);
  const [vendorLiveState, setVendorLiveState] = useState<VendorLiveState>({
    isLive: false,
    location: null,
  });
  const [publicVendorRecords, setPublicVendorRecords] = useState<VendorTabRecord[]>([]);

  const loadVendorProfile = useCallback(async () => {
    const [profile, liveState] = await Promise.all([getVendorProfile(), getVendorLiveState()]);
    setVendorProfile(profile);
    setVendorLiveState(liveState);

    if (!env.hasSupabase) {
      setPublicVendorRecords([]);
      return;
    }

    try {
      const [
        { data: profileRows, error: profileError },
        { data: productRows, error: productsError },
        { data: demoProfileRows, error: demoProfilesError },
        { data: demoProductRows, error: demoProductsError },
      ] = await Promise.all([
        supabase
          .from('vendor_profiles')
          .select(
            'user_id,first_name,last_name,business_name,logo_symbol,category,country,phone,opening_hours,about,is_live,live_latitude,live_longitude,live_updated_at'
          ),
        supabase
          .from('vendor_products')
          .select('id,user_id,name,price_label,is_available,image_symbol,sort_order')
          .order('sort_order', { ascending: true }),
        supabase
          .from('demo_vendor_profiles')
          .select(
            'id,owner_name,business_name,logo_symbol,category,country,phone,opening_hours,about,is_live,live_latitude,live_longitude,live_updated_at,rating,price_hint,next_area,tags'
          ),
        supabase
          .from('demo_vendor_products')
          .select('id,vendor_id,name,price_label,is_available,image_symbol,sort_order')
          .order('sort_order', { ascending: true }),
      ]);

      if (profileError || productsError || demoProfilesError || demoProductsError) {
        setPublicVendorRecords([]);
        return;
      }

      setPublicVendorRecords(
        [
          ...mapSupabaseVendorRowsToRecords(
            (profileRows ?? []) as SupabaseVendorProfileRow[],
            (productRows ?? []) as SupabaseVendorProductRow[]
          ),
          ...mapDemoVendorRowsToRecords(
            (demoProfileRows ?? []) as DemoVendorProfileRow[],
            (demoProductRows ?? []) as DemoVendorProductRow[]
          ),
        ]
      );
    } catch {
      setPublicVendorRecords([]);
    }
  }, []);

  useEffect(() => {
    void loadVendorProfile();
  }, [loadVendorProfile]);

  useEffect(() => {
    if (!env.hasSupabase) {
      return;
    }

    const channel = supabase
      .channel('vendor-discovery-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendor_profiles' },
        () => {
          void loadVendorProfile();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendor_products' },
        () => {
          void loadVendorProfile();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadVendorProfile]);

  const vendorTabRecords = useMemo(() => {
    const localRecords = mergeVendorProfileIntoRecords(baseVendorTabRecords, vendorProfile, vendorLiveState);
    const mergedRecords = mergeDiscoveryRecords(localRecords, publicVendorRecords);
    return applyUserDistanceToRecords(mergedRecords, userCoordinates);
  }, [publicVendorRecords, userCoordinates, vendorProfile, vendorLiveState]);
  const vendors = useMemo(() => {
    const localVendors = mergeVendorProfileIntoVendors(baseVendors, vendorProfile, vendorLiveState);
    const publicVendors = publicVendorRecords.map(recordToVendor);
    const mergedByName = new Map<string, Vendor>();

    for (const vendor of localVendors) {
      mergedByName.set(vendor.name.trim().toLowerCase(), vendor);
    }

    for (const vendor of publicVendors) {
      mergedByName.set(vendor.name.trim().toLowerCase(), vendor);
    }

    return Array.from(mergedByName.values());
  }, [publicVendorRecords, vendorProfile, vendorLiveState]);

  return {
    vendorProfile,
    vendorLiveState,
    vendorTabRecords,
    vendors,
    reloadVendorData: loadVendorProfile,
  };
}
