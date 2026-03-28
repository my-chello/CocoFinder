import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';
import { supabase } from './supabase';

export type CustomerProfileSetup = {
  email?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePhotoUrl?: string;
  profilePhotoBase64?: string;
  profilePhotoMimeType?: string;
};

export type SaveCustomerProfileResult = {
  profile: CustomerProfileSetup;
  emailChangeRequested: boolean;
};

const CUSTOMER_PROFILE_STORAGE_KEY = 'cocofinder:customer-profile';
const CUSTOMER_CACHE_OWNER_STORAGE_KEY = 'cocofinder:customer-cache-owner';
const CUSTOMER_PROFILE_PHOTO_BUCKET = 'profile-photos';

function decodeBase64ToArrayBuffer(value: string) {
  const decoder = globalThis.atob;

  if (typeof decoder !== 'function') {
    throw new Error('Base64 decoding is not available on this device.');
  }

  const binary = decoder(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

type CustomerProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  profile_photo_url: string | null;
};

function isLocalProfilePhotoUrl(value: string) {
  return /^(file|content|ph|assets-library):/i.test(value);
}

function getProfilePhotoFileExtension(uri: string, fallback = 'jpg') {
  const match = uri.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  return match?.[1]?.toLowerCase() ?? fallback;
}

async function uploadCustomerProfilePhoto(userId: string, profilePhotoUrl?: string) {
  const normalizedUrl = profilePhotoUrl?.trim();

  if (!normalizedUrl) {
    return undefined;
  }

  if (!isLocalProfilePhotoUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  const response = await fetch(normalizedUrl);

  if (!response.ok) {
    throw new Error('Could not read the selected profile photo.');
  }

  const photoBlob = await response.blob();
  const extension = getProfilePhotoFileExtension(normalizedUrl);
  const contentType = photoBlob.type || `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  const objectPath = `${userId}/customer-profile-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CUSTOMER_PROFILE_PHOTO_BUCKET)
    .upload(objectPath, photoBlob, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(CUSTOMER_PROFILE_PHOTO_BUCKET).getPublicUrl(objectPath);

  return publicUrl;
}

async function uploadCustomerProfilePhotoFromProfile(
  userId: string,
  profile: CustomerProfileSetup
) {
  const normalizedUrl = profile.profilePhotoUrl?.trim();
  const normalizedBase64 = profile.profilePhotoBase64?.trim();

  if (!normalizedUrl) {
    return undefined;
  }

  if (!isLocalProfilePhotoUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  if (normalizedBase64) {
    const extension = getProfilePhotoFileExtension(
      normalizedUrl,
      profile.profilePhotoMimeType?.split('/')[1] ?? 'jpg'
    );
    const contentType =
      profile.profilePhotoMimeType?.trim() ||
      `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    const objectPath = `${userId}/customer-profile-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(CUSTOMER_PROFILE_PHOTO_BUCKET)
      .upload(objectPath, decodeBase64ToArrayBuffer(normalizedBase64), {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(CUSTOMER_PROFILE_PHOTO_BUCKET).getPublicUrl(objectPath);

    return publicUrl;
  }

  return uploadCustomerProfilePhoto(userId, normalizedUrl);
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

async function setCustomerCacheOwner(userId: string | null) {
  if (userId) {
    await AsyncStorage.setItem(CUSTOMER_CACHE_OWNER_STORAGE_KEY, userId);
    return;
  }

  await AsyncStorage.removeItem(CUSTOMER_CACHE_OWNER_STORAGE_KEY);
}

async function getCustomerProfileRow(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,first_name,last_name,phone_number,date_of_birth,profile_photo_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CustomerProfileRow | null) ?? null;
}

function normalizeCustomerProfile(
  parsed: Partial<CustomerProfileSetup> | null | undefined
): CustomerProfileSetup | null {
  if (!parsed || typeof parsed.firstName !== 'string' || typeof parsed.lastName !== 'string') {
    return null;
  }

  const firstName = parsed.firstName.trim();
  const lastName = parsed.lastName.trim();

  if (!firstName || !lastName) {
    return null;
  }

  return {
    email:
      typeof parsed.email === 'string' && parsed.email.trim()
        ? parsed.email.trim().toLowerCase()
        : undefined,
    firstName,
    lastName,
    phoneNumber:
      typeof parsed.phoneNumber === 'string' && parsed.phoneNumber.trim()
        ? parsed.phoneNumber.trim()
        : undefined,
    dateOfBirth:
      typeof parsed.dateOfBirth === 'string' && parsed.dateOfBirth.trim()
        ? parsed.dateOfBirth.trim()
        : undefined,
    profilePhotoUrl:
      typeof parsed.profilePhotoUrl === 'string' && parsed.profilePhotoUrl.trim()
        ? parsed.profilePhotoUrl.trim()
        : undefined,
    profilePhotoBase64:
      typeof parsed.profilePhotoBase64 === 'string' && parsed.profilePhotoBase64.trim()
        ? parsed.profilePhotoBase64.trim()
        : undefined,
    profilePhotoMimeType:
      typeof parsed.profilePhotoMimeType === 'string' && parsed.profilePhotoMimeType.trim()
        ? parsed.profilePhotoMimeType.trim()
        : undefined,
  };
}

export async function clearCustomerLocalCache() {
  await AsyncStorage.multiRemove([
    CUSTOMER_PROFILE_STORAGE_KEY,
    CUSTOMER_CACHE_OWNER_STORAGE_KEY,
  ]);
}

export async function ensureCustomerCacheForUser(userId: string | null) {
  const cachedOwner = await AsyncStorage.getItem(CUSTOMER_CACHE_OWNER_STORAGE_KEY);

  if (!userId) {
    await clearCustomerLocalCache();
    return;
  }

  if (cachedOwner === userId) {
    return;
  }

  const user = await getSupabaseAuthUser();
  const profileRow = user ? await getCustomerProfileRow(user.id) : null;
  const normalizedProfile = normalizeCustomerProfile({
    email: profileRow?.email ?? user?.email ?? '',
    firstName:
      profileRow?.first_name ??
      (typeof user?.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : ''),
    lastName:
      profileRow?.last_name ??
      (typeof user?.user_metadata?.last_name === 'string' ? user.user_metadata.last_name : ''),
    phoneNumber:
      profileRow?.phone_number ??
      (typeof user?.user_metadata?.phone_number === 'string' ? user.user_metadata.phone_number : ''),
    dateOfBirth:
      profileRow?.date_of_birth ??
      (typeof user?.user_metadata?.date_of_birth === 'string' ? user.user_metadata.date_of_birth : ''),
    profilePhotoUrl:
      profileRow?.profile_photo_url ??
      (typeof user?.user_metadata?.profile_photo_url === 'string'
        ? user.user_metadata.profile_photo_url
        : ''),
  });

  if (normalizedProfile) {
    await AsyncStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
  } else {
    await AsyncStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY);
  }

  await setCustomerCacheOwner(userId);
}

export async function getCustomerProfile() {
  const user = await getSupabaseAuthUser();
  const userId = user?.id ?? null;

  await ensureCustomerCacheForUser(userId);

  const rawValue = await AsyncStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeCustomerProfile(JSON.parse(rawValue) as Partial<CustomerProfileSetup>);
  } catch {
    return null;
  }
}

export async function hasCustomerProfile() {
  const profile = await getCustomerProfile();
  return Boolean(profile?.firstName.trim() && profile?.lastName.trim());
}

export async function saveCustomerProfile(profile: CustomerProfileSetup) {
  const user = await getSupabaseAuthUser();

  if (!user?.id) {
    throw new Error('No authenticated customer found.');
  }

  const normalizedProfile = normalizeCustomerProfile(profile);

  if (!normalizedProfile) {
    throw new Error('Customer profile is incomplete.');
  }

  const nextEmail = normalizedProfile.email ?? user.email ?? undefined;
  const uploadedProfilePhotoUrl = await uploadCustomerProfilePhotoFromProfile(user.id, normalizedProfile);
  const emailChangeRequested = Boolean(
    nextEmail &&
      user.email &&
      nextEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()
  );
  const profileToPersist: CustomerProfileSetup = {
    email: nextEmail,
    firstName: normalizedProfile.firstName,
    lastName: normalizedProfile.lastName,
    phoneNumber: normalizedProfile.phoneNumber,
    dateOfBirth: normalizedProfile.dateOfBirth,
    profilePhotoUrl: uploadedProfilePhotoUrl,
  };

  await AsyncStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(profileToPersist));
  await setCustomerCacheOwner(user.id);

  const { error: authError } = await supabase.auth.updateUser({
    ...(emailChangeRequested ? { email: nextEmail } : {}),
    data: {
      ...(user.user_metadata ?? {}),
      email_address: nextEmail ?? null,
      first_name: normalizedProfile.firstName,
      last_name: normalizedProfile.lastName,
      phone_number: normalizedProfile.phoneNumber ?? null,
      date_of_birth: normalizedProfile.dateOfBirth ?? null,
      profile_photo_url: uploadedProfilePhotoUrl ?? null,
    },
  });

  if (authError) {
    throw authError;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: nextEmail ?? null,
      role: 'customer',
      first_name: normalizedProfile.firstName,
      last_name: normalizedProfile.lastName,
      phone_number: normalizedProfile.phoneNumber ?? null,
      date_of_birth: normalizedProfile.dateOfBirth ?? null,
      profile_photo_url: uploadedProfilePhotoUrl ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    throw error;
  }

  return {
    profile: profileToPersist,
    emailChangeRequested,
  } satisfies SaveCustomerProfileResult;
}
