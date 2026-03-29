import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';
import { supabase } from './supabase';
import {
  getVendorOpeningHoursSummary,
  parseVendorOpeningHoursValue,
  serializeVendorOpeningHoursRows,
  type VendorOpeningHoursRow,
} from './vendorOpeningHours';

export type VendorProfileSetup = {
  firstName: string;
  lastName: string;
  businessName: string;
  logoSymbol: string;
  category: string;
  country: string;
  phone: string;
  openingHours: string;
  openingHoursRows?: VendorOpeningHoursRow[];
  firstProductName: string;
  firstProductPrice: string;
  about: string;
  products?: VendorEditableProduct[];
};

export type VendorEditableProduct = {
  id: string;
  name: string;
  priceLabel: string;
  isAvailable: boolean;
  imageSymbol?: string;
};

export type VendorStoredLocation = {
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export type VendorLiveState = {
  isLive: boolean;
  location: VendorStoredLocation | null;
};

export const MAX_VENDOR_LOGO_SYMBOL_GRAPHEMES = 1;

const VENDOR_PROFILE_STORAGE_KEY = 'cocofinder:vendor-profile';
const VENDOR_LIVE_STATE_STORAGE_KEY = 'cocofinder:vendor-live-state';
const VENDOR_CACHE_OWNER_STORAGE_KEY = 'cocofinder:vendor-cache-owner';

type VendorProfileRow = {
  user_id: string;
  email?: string | null;
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

type VendorProductRow = {
  id: string;
  name: string;
  price_label: string;
  is_available: boolean;
  image_symbol: string | null;
  sort_order: number;
};

type ProfileLookupRow = {
  id: string;
  email: string | null;
  role: string | null;
};

function splitGraphemes(value: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  }

  return Array.from(value);
}

export function normalizeVendorLogoSymbol(
  value: string,
  maxGraphemes = MAX_VENDOR_LOGO_SYMBOL_GRAPHEMES
) {
  const compactValue = value.replace(/\s+/g, ' ').trim();

  if (!compactValue) {
    return '';
  }

  return splitGraphemes(compactValue).slice(0, maxGraphemes).join('');
}

function getScopedProductId(userId: string, productId: string) {
  const normalizedProductId = productId.trim() || 'vendor-product-primary';
  const scopedPrefix = `${userId}:`;

  if (normalizedProductId.startsWith(scopedPrefix)) {
    return normalizedProductId;
  }

  return `${scopedPrefix}${normalizedProductId}`;
}

function getLocalProductId(userId: string, storedProductId: string) {
  const scopedPrefix = `${userId}:`;

  if (storedProductId.startsWith(scopedPrefix)) {
    return storedProductId.slice(scopedPrefix.length) || 'vendor-product-primary';
  }

  return storedProductId;
}

function isMissingTableError(message?: string) {
  return Boolean(message && /relation .* does not exist/i.test(message));
}

function isMissingEmailColumnError(message?: string) {
  return Boolean(
    message &&
      (/column .*email/i.test(message) ||
        /schema cache/i.test(message))
  );
}

async function getVendorProfileRowsForUserId(userId: string) {
  const [{ data: profileRow, error: profileError }, { data: productRows, error: productsError }] =
    await Promise.all([
      supabase.from('vendor_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('vendor_products')
        .select('id,name,price_label,is_available,image_symbol,sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
    ]);

  if (profileError && !isMissingTableError(profileError.message)) {
    throw profileError;
  }

  if (productsError && !isMissingTableError(productsError.message)) {
    throw productsError;
  }

  return {
    profileRow: (profileRow as VendorProfileRow | null) ?? null,
    productRows: (productRows ?? []) as VendorProductRow[],
  };
}

async function getVendorUserIdByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('email', normalizedEmail)
    .eq('role', 'vendor')
    .limit(1);

  if (error) {
    if (isMissingTableError(error.message) || isMissingEmailColumnError(error.message)) {
      return null;
    }

    throw error;
  }

  const row = data?.[0] as ProfileLookupRow | undefined;
  return row?.id ?? null;
}

async function getSupabaseAuthUser() {
  if (!env.hasSupabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

async function getSupabaseUserId() {
  const user = await getSupabaseAuthUser();

  return user?.id ?? null;
}

async function getSupabaseUserEmail() {
  const user = await getSupabaseAuthUser();

  return user?.email?.trim().toLowerCase() ?? null;
}

async function setVendorCacheOwner(userId: string | null) {
  if (userId) {
    await AsyncStorage.setItem(VENDOR_CACHE_OWNER_STORAGE_KEY, userId);
    return;
  }

  await AsyncStorage.removeItem(VENDOR_CACHE_OWNER_STORAGE_KEY);
}

function normalizeVendorProfile(parsed: VendorProfileSetup): VendorProfileSetup | null {
  if (
    typeof parsed.firstName !== 'string' ||
    typeof parsed.lastName !== 'string' ||
    typeof parsed.businessName !== 'string' ||
    typeof parsed.logoSymbol !== 'string' ||
    typeof parsed.category !== 'string' ||
    (typeof parsed.country !== 'string' && typeof parsed.country !== 'undefined') ||
    typeof parsed.phone !== 'string' ||
    typeof parsed.openingHours !== 'string' ||
    typeof parsed.firstProductName !== 'string' ||
    typeof parsed.firstProductPrice !== 'string' ||
    typeof parsed.about !== 'string'
  ) {
    return null;
  }

  const normalizedLogoSymbol = normalizeVendorLogoSymbol(parsed.logoSymbol);
  const normalizedProducts = Array.isArray(parsed.products)
    ? parsed.products.filter(
        (product): product is VendorEditableProduct =>
          typeof product?.id === 'string' &&
          typeof product?.name === 'string' &&
          typeof product?.priceLabel === 'string' &&
          typeof product?.isAvailable === 'boolean' &&
          (typeof product?.imageSymbol === 'string' || typeof product?.imageSymbol === 'undefined')
      )
    : [];

  const parsedOpeningHours = parseVendorOpeningHoursValue(parsed.openingHours);
  const normalizedOpeningHoursRows = Array.isArray(parsed.openingHoursRows)
    ? parsed.openingHoursRows.filter(
        (row): row is VendorOpeningHoursRow =>
          typeof row?.id === 'string' &&
          typeof row?.dayGroup === 'string' &&
          typeof row?.openTime === 'string' &&
          typeof row?.closeTime === 'string'
      )
    : parsedOpeningHours.rows;
  const normalizedOpeningHours =
    normalizedOpeningHoursRows.length > 0
      ? getVendorOpeningHoursSummary(normalizedOpeningHoursRows)
      : parsedOpeningHours.summary;

  const seededProducts =
    normalizedProducts.length > 0
      ? normalizedProducts
      : [
          {
            id: 'vendor-product-primary',
            name: parsed.firstProductName,
            priceLabel: parsed.firstProductPrice,
            isAvailable: true,
            imageSymbol: normalizedLogoSymbol,
          },
        ];

  return {
    ...parsed,
    firstName: parsed.firstName || 'Michaello',
    lastName: parsed.lastName || 'Vendor',
    logoSymbol: normalizedLogoSymbol,
    country: parsed.country || 'Netherlands',
    openingHours: normalizedOpeningHours,
    openingHoursRows: normalizedOpeningHoursRows,
    products: seededProducts,
  };
}

function mapSupabaseProfileToLocal(
  profileRow: VendorProfileRow,
  productRows: VendorProductRow[]
): VendorProfileSetup {
  const parsedOpeningHours = parseVendorOpeningHoursValue(profileRow.opening_hours);
  const scopedUserId = profileRow.user_id;
  const normalizedProducts =
    productRows.length > 0
      ? productRows
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((product) => ({
            id: getLocalProductId(scopedUserId, product.id),
            name: product.name,
            priceLabel: product.price_label,
            isAvailable: product.is_available,
            imageSymbol: product.image_symbol ?? undefined,
          }))
      : [
          {
            id: 'vendor-product-primary',
            name: '',
            priceLabel: '',
            isAvailable: true,
            imageSymbol: profileRow.logo_symbol ?? '🛺',
          },
        ];

  return normalizeVendorProfile({
    firstName: profileRow.first_name ?? '',
    lastName: profileRow.last_name ?? '',
    businessName: profileRow.business_name ?? '',
    logoSymbol: profileRow.logo_symbol ?? '',
    category: profileRow.category ?? '',
    country: profileRow.country ?? 'Netherlands',
    phone: profileRow.phone ?? '',
    openingHours: parsedOpeningHours.summary,
    openingHoursRows: parsedOpeningHours.rows,
    firstProductName: normalizedProducts[0]?.name ?? '',
    firstProductPrice: normalizedProducts[0]?.priceLabel ?? '',
    about: profileRow.about ?? '',
    products: normalizedProducts,
  }) ?? {
    firstName: 'Michaello',
    lastName: 'Vendor',
    businessName: '',
    logoSymbol: '🛺',
    category: '',
    country: 'Netherlands',
    phone: '',
    openingHours: '',
    openingHoursRows: [],
    firstProductName: '',
    firstProductPrice: '',
    about: '',
    products: normalizedProducts,
  };
}

async function getSupabaseVendorProfile(): Promise<VendorProfileSetup | null> {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return null;
  }

  const { profileRow, productRows } = await getVendorProfileRowsForUserId(userId);

  if (!profileRow) {
    return null;
  }

  return mapSupabaseProfileToLocal(
    profileRow as VendorProfileRow,
    (productRows ?? []) as VendorProductRow[]
  );
}

async function getSupabaseVendorProfileByEmail(email: string): Promise<VendorProfileSetup | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('email', normalizedEmail)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (profileError) {
    if (isMissingTableError(profileError.message) || isMissingEmailColumnError(profileError.message)) {
      return null;
    }

    throw profileError;
  }

  const profileRow = profileRows?.[0] as VendorProfileRow | undefined;

  if (profileRow) {
    const { data: productRows, error: productsError } = await supabase
      .from('vendor_products')
      .select('id,name,price_label,is_available,image_symbol,sort_order')
      .eq('user_id', profileRow.user_id)
      .order('sort_order', { ascending: true });

    if (productsError && !isMissingTableError(productsError.message)) {
      throw productsError;
    }

    return mapSupabaseProfileToLocal(profileRow, (productRows ?? []) as VendorProductRow[]);
  }

  const vendorUserId = await getVendorUserIdByEmail(normalizedEmail);

  if (!vendorUserId) {
    return null;
  }

  const { profileRow: matchedProfileRow, productRows: matchedProductRows } =
    await getVendorProfileRowsForUserId(vendorUserId);

  if (!matchedProfileRow) {
    return null;
  }

  return mapSupabaseProfileToLocal(matchedProfileRow, matchedProductRows);
}

async function saveSupabaseVendorProfile(profile: VendorProfileSetup) {
  const [userId, email] = await Promise.all([getSupabaseUserId(), getSupabaseUserEmail()]);

  if (!userId) {
    return;
  }

  const { error: profileError } = await supabase.from('vendor_profiles').upsert(
    {
      user_id: userId,
      email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      business_name: profile.businessName,
      logo_symbol: profile.logoSymbol,
      category: profile.category,
      country: profile.country,
      phone: profile.phone,
      opening_hours:
        (profile.openingHoursRows ?? []).length > 0
          ? serializeVendorOpeningHoursRows(profile.openingHoursRows ?? [])
          : profile.openingHours,
      about: profile.about,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (profileError && !isMissingTableError(profileError.message)) {
    throw profileError;
  }

  const { error: deleteError } = await supabase.from('vendor_products').delete().eq('user_id', userId);

  if (deleteError && !isMissingTableError(deleteError.message)) {
    throw new Error(
      `Could not refresh vendor products before saving: ${deleteError.message}`
    );
  }

  const products = (profile.products ?? []).map((product, index) => ({
    id: getScopedProductId(userId, product.id),
    user_id: userId,
    name: product.name,
    price_label: product.priceLabel,
    is_available: product.isAvailable,
    image_symbol: product.imageSymbol ?? null,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  if (products.length === 0) {
    return;
  }

  const { error: productsError } = await supabase.from('vendor_products').insert(products);

  if (productsError && !isMissingTableError(productsError.message)) {
    throw new Error(
      `Could not save vendor products to the database: ${productsError.message}`
    );
  }
}

async function clearSupabaseVendorProfile() {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return;
  }

  const [productsResult, profileResult] = await Promise.all([
    supabase.from('vendor_products').delete().eq('user_id', userId),
    supabase.from('vendor_profiles').delete().eq('user_id', userId),
  ]);

  if (productsResult.error && !isMissingTableError(productsResult.error.message)) {
    throw productsResult.error;
  }

  if (profileResult.error && !isMissingTableError(profileResult.error.message)) {
    throw profileResult.error;
  }
}

async function getSupabaseVendorLiveState(): Promise<VendorLiveState | null> {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('is_live,live_latitude,live_longitude,live_updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !isMissingTableError(error.message)) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    isLive: Boolean(data.is_live),
    location:
      typeof data.live_latitude === 'number' &&
      typeof data.live_longitude === 'number' &&
      typeof data.live_updated_at === 'string'
        ? {
            latitude: data.live_latitude,
            longitude: data.live_longitude,
            updatedAt: data.live_updated_at,
          }
        : null,
  };
}

async function getSupabaseVendorLiveStateByEmail(email: string): Promise<VendorLiveState | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('is_live,live_latitude,live_longitude,live_updated_at')
    .eq('email', normalizedEmail)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingTableError(error.message) || isMissingEmailColumnError(error.message)) {
      return null;
    }

    throw error;
  }

  const row = data?.[0];

  if (!row) {
    return null;
  }

  return {
    isLive: Boolean(row.is_live),
    location:
      typeof row.live_latitude === 'number' &&
      typeof row.live_longitude === 'number' &&
      typeof row.live_updated_at === 'string'
        ? {
            latitude: row.live_latitude,
            longitude: row.live_longitude,
            updatedAt: row.live_updated_at,
          }
        : null,
  };
}

async function saveSupabaseVendorLiveState(liveState: VendorLiveState) {
  const [userId, email] = await Promise.all([getSupabaseUserId(), getSupabaseUserEmail()]);

  if (!userId) {
    return;
  }

  const { error } = await supabase.from('vendor_profiles').upsert(
    {
      user_id: userId,
      email,
      is_live: liveState.isLive,
      live_latitude: liveState.location?.latitude ?? null,
      live_longitude: liveState.location?.longitude ?? null,
      live_updated_at: liveState.location?.updatedAt ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error && !isMissingTableError(error.message)) {
    throw error;
  }
}

export async function getVendorProfile(): Promise<VendorProfileSetup | null> {
  try {
    const supabaseProfile = await getSupabaseVendorProfile();

    if (supabaseProfile) {
      await AsyncStorage.setItem(VENDOR_PROFILE_STORAGE_KEY, JSON.stringify(supabaseProfile));
      return supabaseProfile;
    }

    const authEmail = await getSupabaseUserEmail();

    if (authEmail) {
      const emailMatchedProfile = await getSupabaseVendorProfileByEmail(authEmail);

      if (emailMatchedProfile) {
        await AsyncStorage.setItem(VENDOR_PROFILE_STORAGE_KEY, JSON.stringify(emailMatchedProfile));
        return emailMatchedProfile;
      }
    }
  } catch {}

  const storedValue = await AsyncStorage.getItem(VENDOR_PROFILE_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as VendorProfileSetup;
    const normalizedProfile = normalizeVendorProfile(parsed);

    if (normalizedProfile) {
      return normalizedProfile;
    }
  } catch {}

  return null;
}

export async function hasVendorProfile() {
  const profile = await getVendorProfile();
  return Boolean(profile);
}

export async function saveVendorProfile(profile: VendorProfileSetup) {
  const normalizedProfile = normalizeVendorProfile(profile);

  if (!normalizedProfile) {
    return;
  }

  await setVendorCacheOwner(await getSupabaseUserId());
  await AsyncStorage.setItem(VENDOR_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
  await saveSupabaseVendorProfile(normalizedProfile);
}

export async function clearVendorProfile() {
  await AsyncStorage.removeItem(VENDOR_PROFILE_STORAGE_KEY);
  try {
    await clearSupabaseVendorProfile();
  } catch {}
}

export async function getVendorLiveState(): Promise<VendorLiveState> {
  try {
    const supabaseLiveState = await getSupabaseVendorLiveState();

    if (supabaseLiveState) {
      await AsyncStorage.setItem(VENDOR_LIVE_STATE_STORAGE_KEY, JSON.stringify(supabaseLiveState));
      return supabaseLiveState;
    }

    const authEmail = await getSupabaseUserEmail();

    if (authEmail) {
      const emailMatchedLiveState = await getSupabaseVendorLiveStateByEmail(authEmail);

      if (emailMatchedLiveState) {
        await AsyncStorage.setItem(
          VENDOR_LIVE_STATE_STORAGE_KEY,
          JSON.stringify(emailMatchedLiveState)
        );
        return emailMatchedLiveState;
      }
    }
  } catch {}

  const storedValue = await AsyncStorage.getItem(VENDOR_LIVE_STATE_STORAGE_KEY);

  if (!storedValue) {
    return {
      isLive: false,
      location: null,
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as VendorLiveState;
    const isValidLocation =
      parsed.location === null ||
      (typeof parsed.location?.latitude === 'number' &&
        typeof parsed.location?.longitude === 'number' &&
        typeof parsed.location?.updatedAt === 'string');

    if (typeof parsed.isLive === 'boolean' && isValidLocation) {
      return parsed;
    }
  } catch {}

  return {
    isLive: false,
    location: null,
  };
}

export async function saveVendorLiveState(liveState: VendorLiveState) {
  await setVendorCacheOwner(await getSupabaseUserId());
  await AsyncStorage.setItem(VENDOR_LIVE_STATE_STORAGE_KEY, JSON.stringify(liveState));
  try {
    await saveSupabaseVendorLiveState(liveState);
  } catch {}
}

export async function clearVendorLiveState() {
  await AsyncStorage.removeItem(VENDOR_LIVE_STATE_STORAGE_KEY);
}

export async function clearVendorLocalCache() {
  await AsyncStorage.multiRemove([
    VENDOR_PROFILE_STORAGE_KEY,
    VENDOR_LIVE_STATE_STORAGE_KEY,
    VENDOR_CACHE_OWNER_STORAGE_KEY,
  ]);
}

export async function ensureVendorCacheForUser(userId: string | null) {
  const cachedOwner = await AsyncStorage.getItem(VENDOR_CACHE_OWNER_STORAGE_KEY);

  if (!cachedOwner && !userId) {
    return;
  }

  if (cachedOwner === userId) {
    return;
  }

  await clearVendorLocalCache();

  if (userId) {
    await setVendorCacheOwner(userId);
  }
}
