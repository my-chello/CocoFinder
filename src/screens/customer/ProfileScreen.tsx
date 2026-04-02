import { useCallback, useEffect, useRef, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { VendorOpeningHoursEditor } from '../../components/VendorOpeningHoursEditor';
import { useAuth } from '../../context/AuthContext';
import { palette } from '../../config/theme';
import { COUNTRY_OPTIONS, normalizeCountryName } from '../../lib/countries';
import { formatPriceForCountry } from '../../lib/currency';
import { VENDOR_CATEGORY_OPTIONS, getVendorCategoryLabel } from '../../lib/vendorCategories';
import {
  createEmptyVendorOpeningHoursRow,
  getVendorOpeningHoursSummary,
} from '../../lib/vendorOpeningHours';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../../lib/notificationPreferences';
import { resetOnboarding } from '../../lib/onboarding';
import { registerDevicePushToken } from '../../lib/pushNotifications';
import {
  clearVendorLiveState,
  clearVendorProfile,
  type VendorEditableProduct,
  getVendorLiveState,
  getVendorProfile,
  normalizeVendorLogoSymbol,
  saveVendorLiveState,
  saveVendorProfile,
  type VendorLiveState,
  type VendorProfileSetup,
} from '../../lib/vendorProfile';
import {
  clearCustomerLocalCache,
  getCustomerProfile,
  saveCustomerProfile,
  type CustomerProfileSetup,
} from '../../lib/customerProfile';

type NotificationPreferenceKey = keyof NotificationPreferences;
type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

function toStoredDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateOfBirthLabel(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
}

function getInitialDate(value?: string) {
  const parsedDate = value ? new Date(value) : new Date('2000-01-01');

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date('2000-01-01');
  }

  return parsedDate;
}

const minimumDateOfBirth = new Date('1900-01-01');

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function TrashOutlineIcon() {
  return (
    <View style={styles.trashIconWrap}>
      <View style={styles.trashIconLid} />
      <View style={styles.trashIconHandle} />
      <View style={styles.trashIconBody}>
        <View style={styles.trashIconLine} />
        <View style={styles.trashIconLine} />
      </View>
    </View>
  );
}

function confirmInBrowser(title: string, message: string) {
  if (Platform.OS !== 'web' || typeof globalThis.confirm !== 'function') {
    return true;
  }

  return globalThis.confirm(`${title}\n\n${message}`);
}

function showInfoMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function VendorProfileEditor({
  initialProfile,
  vendorLiveState,
  notificationPreferences,
  isSavingNotificationPreferences,
  onToggleNotificationPreference,
}: {
  initialProfile: VendorProfileSetup | null;
  vendorLiveState: VendorLiveState;
  notificationPreferences: NotificationPreferences;
  isSavingNotificationPreferences: boolean;
  onToggleNotificationPreference: (
    key: NotificationPreferenceKey,
    value: boolean
  ) => void;
}) {
  const [activeEditSection, setActiveEditSection] = useState<
    'business' | 'products' | 'hours' | null
  >(null);
  const [profile, setProfile] = useState<VendorProfileSetup | null>(initialProfile);
  const [draft, setDraft] = useState<VendorProfileSetup | null>(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
    setDraft(initialProfile);
  }, [initialProfile]);

  if (!profile || !draft) {
    return (
      <View style={styles.vendorCard}>
        <Text style={styles.vendorEyebrow}>Vendor Profile</Text>
        <Text style={styles.vendorTitle}>Profile not available</Text>
        <Text style={styles.vendorCopy}>
          Complete vendor setup first to manage your business details here.
        </Text>
      </View>
    );
  }

  const missingFields = [
    !draft.firstName.trim() ? 'First name' : null,
    !draft.lastName.trim() ? 'Last name' : null,
    !draft.businessName.trim() ? 'Business name' : null,
    !draft.logoSymbol.trim() ? 'Logo symbol' : null,
    !draft.category.trim() ? 'Category' : null,
    !draft.country.trim() ? 'Country' : null,
    !draft.phone.trim() ? 'Phone' : null,
    !draft.openingHours.trim() ? 'Opening times' : null,
    !(draft.products ?? []).length ? 'At least one product' : null,
    (draft.products ?? []).some((product) => !product.name.trim()) ? 'Product name' : null,
    (draft.products ?? []).some((product) => !product.priceLabel.trim()) ? 'Product price' : null,
    !draft.about.trim() ? 'About' : null,
  ].filter(Boolean) as string[];

  async function handleSave() {
    if (missingFields.length > 0) {
      Alert.alert('Complete vendor profile', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    const profileToSave = draft;

    if (!profileToSave) {
      return;
    }

    const normalizedProducts = (profileToSave.products ?? []).map((product) => ({
      ...product,
      priceLabel: formatPriceForCountry(profileToSave.country, product.priceLabel),
    }));
    const primaryProduct = normalizedProducts[0] ?? {
      id: 'vendor-product-primary',
      name: '',
      priceLabel: '',
      isAvailable: true,
      imageSymbol: profileToSave.logoSymbol,
    };
    const normalizedProfileToSave: VendorProfileSetup = {
      ...profileToSave,
      firstProductName: primaryProduct.name,
      firstProductPrice: primaryProduct.priceLabel,
      products: normalizedProducts,
    };

    try {
      await saveVendorProfile(normalizedProfileToSave);
      setProfile(normalizedProfileToSave);
      setDraft(normalizedProfileToSave);
      Alert.alert('Profile saved', 'Your vendor profile has been updated.');
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error
          ? error.message
          : 'Could not save your vendor profile to the database.'
      );
    }
  }

  function updateField<K extends keyof VendorProfileSetup>(key: K, value: VendorProfileSetup[K]) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]:
              key === 'logoSymbol'
                ? (normalizeVendorLogoSymbol(String(value)) as VendorProfileSetup[K])
                : value,
          }
        : current
    );
  }

  function updateProducts(nextProducts: VendorEditableProduct[]) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const primaryProduct = nextProducts[0] ?? {
        id: 'vendor-product-primary',
        name: '',
        priceLabel: '',
      };

      return {
        ...current,
        products: nextProducts,
        firstProductName: primaryProduct.name,
        firstProductPrice: primaryProduct.priceLabel,
      };
    });
  }

  function updateOpeningHoursRows(nextRows: NonNullable<VendorProfileSetup['openingHoursRows']>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            openingHoursRows: nextRows,
            openingHours: getVendorOpeningHoursSummary(nextRows),
          }
        : current
    );
  }

  function addProduct() {
    if (!draft) {
      return;
    }

    const nextIndex = (draft.products?.length ?? 0) + 1;
    const nextProducts = [
      ...(draft.products ?? []),
      {
        id: `vendor-product-${nextIndex}`,
        name: '',
        priceLabel: '',
        isAvailable: true,
        imageSymbol: '📦',
      },
    ];
    updateProducts(nextProducts);
  }

  function updateProduct(productId: string, field: keyof VendorEditableProduct, value: string) {
    if (!draft) {
      return;
    }

    const nextProducts = (draft.products ?? []).map((product) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
    updateProducts(nextProducts);
  }

  function toggleProductAvailability(productId: string) {
    if (!draft) {
      return;
    }

    const nextProducts = (draft.products ?? []).map((product) =>
      product.id === productId ? { ...product, isAvailable: !product.isAvailable } : product
    );
    updateProducts(nextProducts);
  }

  function moveProduct(productId: string, direction: 'up' | 'down') {
    if (!draft) {
      return;
    }

    const nextProducts = [...(draft.products ?? [])];
    const currentIndex = nextProducts.findIndex((product) => product.id === productId);

    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= nextProducts.length) {
      return;
    }

    const temp = nextProducts[currentIndex];
    nextProducts[currentIndex] = nextProducts[targetIndex];
    nextProducts[targetIndex] = temp;
    updateProducts(nextProducts);
  }

  function removeProduct(productId: string) {
    if (!draft) {
      return;
    }

    const nextProducts = (draft.products ?? []).filter((product) => product.id !== productId);
    updateProducts(nextProducts);
  }

  const isEditingBusiness = activeEditSection === 'business';
  const isEditingProducts = activeEditSection === 'products';
  const isEditingHours = activeEditSection === 'hours';
  const liveBusinessStatus = vendorLiveState.isLive ? 'Open now' : 'Closed';

  async function fillBusinessCountryFromLocationIfMissing() {
    if (!draft) {
      return;
    }

    if (draft.country.trim()) {
      return;
    }

    try {
      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        return;
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync();
      const position =
        lastKnownPosition ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      if (!position) {
        return;
      }

      const placemarks = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const detectedCountry = normalizeCountryName(placemarks[0]?.country);

      if (detectedCountry) {
        updateField('country', detectedCountry);
      }
    } catch {
      // Keep the current manual selection flow when location is unavailable.
    }
  }

  function toggleSectionEdit(section: 'business' | 'products' | 'hours') {
    if (!profile) {
      return;
    }

    if (activeEditSection === section) {
      setDraft(profile);
      setActiveEditSection(null);
      return;
    }

    const nextDraft: VendorProfileSetup =
      section === 'hours' && (profile.openingHoursRows?.length ?? 0) === 0
        ? {
            ...profile,
            openingHoursRows: [createEmptyVendorOpeningHoursRow()],
          }
        : profile;

    setDraft(nextDraft);
    setActiveEditSection(section);

    if (section === 'business') {
      void fillBusinessCountryFromLocationIfMissing();
    }
  }

  async function handleSaveSection() {
    await handleSave();
    setActiveEditSection(null);
  }

  return (
    <View style={styles.vendorStack}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Your business</Text>
        <Text style={styles.sectionTitle}>Business profile</Text>

        <View style={styles.vendorHeaderRow}>
          <View style={styles.vendorHeaderCopy}>
            <Text style={styles.vendorCopy}>
              Keep both your contact details and business details accurate so customers always see the right information.
            </Text>
          </View>

          <Pressable
            style={[styles.editButton, isEditingBusiness && styles.editButtonActive]}
            onPress={() => toggleSectionEdit('business')}
          >
            <Text
              style={[
                styles.editButtonText,
                isEditingBusiness && styles.editButtonTextActive,
              ]}
            >
              {isEditingBusiness ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.vendorBlock}>
          <Text style={styles.blockLabel}>Contact person</Text>
          {isEditingBusiness ? (
            <View style={styles.formRow}>
              <TextInput
                value={draft.firstName}
                onChangeText={(value) => updateField('firstName', value)}
                placeholder="First name"
                placeholderTextColor="#8C9AAF"
                style={[styles.profileInput, styles.formRowMain]}
              />
              <TextInput
                value={draft.lastName}
                onChangeText={(value) => updateField('lastName', value)}
                placeholder="Last name"
                placeholderTextColor="#8C9AAF"
                style={[styles.profileInput, styles.formRowMain]}
              />
            </View>
          ) : (
            <Text style={styles.blockText}>
              {profile.firstName} {profile.lastName}
            </Text>
          )}
        </View>

        <View style={styles.vendorBlock}>
          <Text style={styles.blockLabel}>Business details</Text>
          <View style={styles.vendorIdentityRow}>
            <View style={styles.vendorLogoBox}>
              <Text style={styles.vendorLogoText}>
                {isEditingBusiness ? draft.logoSymbol || '🛺' : profile.logoSymbol}
              </Text>
            </View>
            <View style={styles.vendorIdentityCopy}>
              <Text style={styles.blockTitle}>{profile.businessName}</Text>
              <Text style={styles.blockText}>{profile.phone}</Text>
            </View>
          </View>

          {isEditingBusiness ? (
            <View style={styles.formStack}>
              <TextInput
                value={draft.businessName}
                onChangeText={(value) => updateField('businessName', value)}
                placeholder="Business name"
                placeholderTextColor="#8C9AAF"
                style={styles.profileInput}
              />
              <TextInput
                value={draft.logoSymbol}
                onChangeText={(value) => updateField('logoSymbol', value)}
                placeholder="Logo symbol"
                placeholderTextColor="#8C9AAF"
                style={styles.profileInput}
              />
              <TextInput
                value={draft.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="Phone"
                placeholderTextColor="#8C9AAF"
                style={styles.profileInput}
              />
              <View style={styles.profilePickerWrap}>
                <Picker
                  selectedValue={draft.country}
                  onValueChange={(value) => updateField('country', String(value))}
                  style={styles.profilePicker}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.vendorBlock}>
          <Text style={styles.blockLabel}>About</Text>
          {isEditingBusiness ? (
            <TextInput
              value={draft.about}
              onChangeText={(value) => updateField('about', value)}
              placeholder="About your business"
              placeholderTextColor="#8C9AAF"
              style={[styles.profileInput, styles.profileTextArea]}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.blockText}>{profile.about}</Text>
          )}
        </View>

        <View style={styles.vendorBlock}>
          <Text style={styles.blockLabel}>Category</Text>
          {isEditingBusiness ? (
            <View style={styles.profilePickerWrap}>
              <Picker
                selectedValue={draft.category}
                onValueChange={(value) => updateField('category', String(value))}
                style={styles.profilePicker}
              >
                <Picker.Item label="Select a category" value="" />
                {VENDOR_CATEGORY_OPTIONS.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={styles.blockText}>
              {getVendorCategoryLabel(profile.category)}{'\n'}
              Country: {profile.country}
            </Text>
          )}
        </View>

        {isEditingBusiness ? (
          <Pressable style={styles.saveButton} onPress={() => void handleSaveSection()}>
            <Text style={styles.saveButtonText}>Save changes</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.vendorHeaderRow}>
          <View style={styles.vendorHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Products</Text>
            <Text style={styles.sectionTitle}>Products & pricing</Text>
            <Text style={styles.vendorCopy}>
              Manage the products customers see first, including pricing, icons and availability.
            </Text>
          </View>
          <Pressable
            style={[styles.editButton, isEditingProducts && styles.editButtonActive]}
            onPress={() => toggleSectionEdit('products')}
          >
            <Text
              style={[
                styles.editButtonText,
                isEditingProducts && styles.editButtonTextActive,
              ]}
            >
              {isEditingProducts ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.settingsListDark}>
          {isEditingProducts ? (
            <>
              {(draft.products ?? []).map((product, index) => (
                <View key={product.id} style={styles.productEditorCard}>
                  <View style={styles.productEditorHeader}>
                    <View style={styles.productEditorTitleRow}>
                      <View style={styles.productIconBubble}>
                        <Text style={styles.productIconBubbleText}>
                          {product.imageSymbol || '🍽️'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.settingTextDark}>Product {index + 1}</Text>
                        <Text style={styles.settingMetaDark}>
                          {product.isAvailable ? 'Available now' : 'Hidden from customers'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productEditorActions}>
                      <Pressable onPress={() => moveProduct(product.id, 'up')}>
                        <Text style={styles.productSortText}>↑</Text>
                      </Pressable>
                      <Pressable onPress={() => moveProduct(product.id, 'down')}>
                        <Text style={styles.productSortText}>↓</Text>
                      </Pressable>
                      {(draft.products?.length ?? 0) > 1 ? (
                        <Pressable onPress={() => removeProduct(product.id)}>
                          <Text style={styles.removeProductText}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.formStack}>
                    <TextInput
                      value={product.imageSymbol ?? ''}
                      onChangeText={(value) => updateProduct(product.id, 'imageSymbol', value)}
                      placeholder="Product icon"
                      placeholderTextColor="#8C9AAF"
                      style={styles.profileInput}
                    />
                    <TextInput
                      value={product.name}
                      onChangeText={(value) => updateProduct(product.id, 'name', value)}
                      placeholder="Product name"
                      placeholderTextColor="#8C9AAF"
                      style={styles.profileInput}
                    />
                    <TextInput
                      value={product.priceLabel}
                      onChangeText={(value) => updateProduct(product.id, 'priceLabel', value)}
                      placeholder="Price"
                      placeholderTextColor="#8C9AAF"
                      style={styles.profileInput}
                    />
                    <Pressable
                      style={[
                        styles.availabilityToggle,
                        product.isAvailable && styles.availabilityToggleActive,
                      ]}
                      onPress={() => toggleProductAvailability(product.id)}
                    >
                      <Text
                        style={[
                          styles.availabilityToggleText,
                          product.isAvailable && styles.availabilityToggleTextActive,
                        ]}
                      >
                        {product.isAvailable ? 'Available to customers' : 'Unavailable'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              <Pressable style={styles.inlineActionButton} onPress={addProduct}>
                <Text style={styles.inlineActionButtonText}>+ Add product</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={() => void handleSaveSection()}>
                <Text style={styles.saveButtonText}>Save changes</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.settingRowDark}>
                <Text style={styles.settingIcon}>📦</Text>
                <View style={styles.settingCopyWrap}>
                  <Text style={styles.settingTextDark}>
                    {(profile.products ?? []).length} products
                  </Text>
                  <Text style={styles.settingMetaDark}>
                    Your menu is visible to customers in vendor discovery.
                  </Text>
                </View>
              </View>
              {(profile.products ?? []).map((product) => (
                <View key={product.id} style={styles.settingRowDark}>
                  <Text style={styles.settingIcon}>{product.imageSymbol || '💰'}</Text>
                  <View style={styles.settingCopyWrap}>
                    <Text style={styles.settingTextDark}>{product.name}</Text>
                    <Text style={styles.settingMetaDark}>
                      {product.priceLabel} · {product.isAvailable ? 'Available' : 'Unavailable'}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.vendorHeaderRow}>
          <View style={styles.vendorHeaderCopy}>
            <Text style={styles.sectionEyebrow}>Business hours</Text>
            <Text style={styles.sectionTitle}>Opening times</Text>
          </View>
          <Pressable
            style={[styles.editButton, isEditingHours && styles.editButtonActive]}
            onPress={() => toggleSectionEdit('hours')}
          >
            <Text
              style={[
                styles.editButtonText,
                isEditingHours && styles.editButtonTextActive,
              ]}
            >
              {isEditingHours ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.settingsListDark}>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🕒</Text>
            <View style={styles.settingCopyWrap}>
              {isEditingHours ? (
                <View style={styles.formStack}>
                  <VendorOpeningHoursEditor
                    rows={
                      (draft.openingHoursRows?.length ?? 0) > 0
                        ? draft.openingHoursRows ?? []
                        : [createEmptyVendorOpeningHoursRow()]
                    }
                    onChange={updateOpeningHoursRows}
                  />
                  {profile.openingHours && (profile.openingHoursRows?.length ?? 0) === 0 ? (
                    <Text style={styles.settingMetaDark}>
                      Current saved hours: {profile.openingHours}
                    </Text>
                  ) : null}
                  <Text style={styles.settingMetaDark}>Status: {liveBusinessStatus}</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.settingTextDark}>{profile.openingHours}</Text>
                  <Text style={styles.settingMetaDark}>Status: {liveBusinessStatus}</Text>
                </>
              )}
            </View>
          </View>
          {isEditingHours ? (
            <Pressable style={styles.saveButton} onPress={() => void handleSaveSection()}>
              <Text style={styles.saveButtonText}>Save changes</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Live settings</Text>
        <Text style={styles.sectionTitle}>Location & live settings</Text>
        <View style={styles.settingsListDark}>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>📡</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Location services</Text>
              <Text style={styles.settingMetaDark}>
                {vendorLiveState.location ? 'GPS connected' : 'Waiting for GPS permission'}
              </Text>
            </View>
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>📊</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>GPS hours used</Text>
              <Text style={styles.settingMetaDark}>
                {vendorLiveState.isLive ? 'Live session active now' : 'No active live session'}
              </Text>
            </View>
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🔄</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Background tracking status</Text>
              <Text style={styles.settingMetaDark}>
                {vendorLiveState.isLive
                  ? 'Foreground GPS updates are active'
                  : 'Tracking is currently turned off'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>Settings</Text>
        <Text style={styles.sectionTitle}>App preferences</Text>
        <View style={styles.settingsListDark}>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🔔</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Message notifications</Text>
              <Text style={styles.settingMetaDark}>Get alerted when customers or vendors send you a new message.</Text>
            </View>
            <Switch
              value={notificationPreferences.messageNotifications}
              onValueChange={(value) => onToggleNotificationPreference('messageNotifications', value)}
              disabled={isSavingNotificationPreferences}
              trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
              thumbColor={notificationPreferences.messageNotifications ? '#166534' : '#FFFFFF'}
            />
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>📍</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Vendor updates</Text>
              <Text style={styles.settingMetaDark}>Receive live-status and route alerts that matter to your business.</Text>
            </View>
            <Switch
              value={notificationPreferences.vendorUpdates}
              onValueChange={(value) => onToggleNotificationPreference('vendorUpdates', value)}
              disabled={isSavingNotificationPreferences}
              trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
              thumbColor={notificationPreferences.vendorUpdates ? '#166534' : '#FFFFFF'}
            />
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>✨</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Promotions and news</Text>
              <Text style={styles.settingMetaDark}>Receive product highlights, launches and curated platform updates.</Text>
            </View>
            <Switch
              value={notificationPreferences.marketingNotifications}
              onValueChange={(value) => onToggleNotificationPreference('marketingNotifications', value)}
              disabled={isSavingNotificationPreferences}
              trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
              thumbColor={notificationPreferences.marketingNotifications ? '#166534' : '#FFFFFF'}
            />
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🌍</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Language</Text>
              <Text style={styles.settingMetaDark}>English</Text>
            </View>
          </View>
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🇳🇱</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Country</Text>
              <Text style={styles.settingMetaDark}>{profile.country}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.supportCard}>
        <View style={styles.supportCopyWrap}>
          <Text style={styles.sectionEyebrow}>Need help?</Text>
          <Text style={styles.sectionTitle}>Let&apos;s get it sorted</Text>
          <Text style={styles.supportText}>
            Reach support if you need help with live tracking, products or your vendor account.
          </Text>
        </View>
        <View style={styles.supportIconWrap}>
          <Text style={styles.supportIcon}>💬</Text>
        </View>
      </View>
    </View>
  );
}

function CustomerProfileEditor({
  initialProfile,
}: {
  initialProfile: CustomerProfileSetup | null;
}) {
  const [profile, setProfile] = useState<CustomerProfileSetup | null>(initialProfile);
  const [draft, setDraft] = useState<CustomerProfileSetup | null>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [dateOfBirthPickerValue, setDateOfBirthPickerValue] = useState<Date>(getInitialDate(initialProfile?.dateOfBirth));
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setDraft(initialProfile);
  }, [initialProfile]);

  if (!profile || !draft) {
    return (
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>Customer</Text>
        <Text style={styles.profileSub}>Complete customer setup first to manage your profile details.</Text>
      </View>
    );
  }

  const missingFields = [
    !(draft.email ?? '').trim() ? 'Email' : null,
    !draft.firstName.trim() ? 'First name' : null,
    !draft.lastName.trim() ? 'Last name' : null,
  ].filter(Boolean) as string[];

  async function handlePickPhoto() {
    try {
      setIsPickingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setDraft((current) =>
        current
          ? {
              ...current,
              profilePhotoUrl: result.assets[0].uri,
              profilePhotoBase64: result.assets[0].base64 ?? undefined,
              profilePhotoMimeType: result.assets[0].mimeType ?? undefined,
            }
          : current
      );
    } catch {
      Alert.alert('Photo upload failed', 'Could not open your photo library right now.');
    } finally {
      setIsPickingPhoto(false);
    }
  }

  function handleDateOfBirthChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowDateOfBirthPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setDateOfBirthPickerValue(selectedDate);
    setDraft((current) => (current ? { ...current, dateOfBirth: toStoredDateValue(selectedDate) } : current));
  }

  async function handleSave() {
    if (missingFields.length > 0) {
      Alert.alert('Complete profile', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    if (!draft) {
      return;
    }

    if (!isValidEmail(draft.email ?? '')) {
      Alert.alert('Invalid email', 'Enter a valid email address to update your account.');
      return;
    }

    try {
      const result = await saveCustomerProfile(draft);
      setProfile(result.profile);
      setDraft(result.profile);
      setIsEditing(false);
      Alert.alert(
        result.emailChangeRequested ? 'Profile saved' : 'Profile saved',
        result.emailChangeRequested
          ? 'Your profile has been updated. If email confirmation is enabled, check your inbox to confirm the new email address.'
          : 'Your customer profile has been updated.'
      );
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Could not save your customer profile right now.'
      );
    }
  }

  return (
    <View style={styles.profileCard}>
      <View style={styles.customerProfileHeader}>
        <View style={styles.customerAvatarWrap}>
          {draft.profilePhotoUrl ? (
            <Image source={{ uri: draft.profilePhotoUrl }} style={styles.customerAvatarImage} />
          ) : (
            <Text style={styles.customerAvatarText}>
              {draft.firstName.trim().charAt(0).toUpperCase() || 'C'}
            </Text>
          )}
        </View>
        <View style={styles.customerProfileHeaderCopy}>
          <Text style={styles.profileName}>{`${profile.firstName.trim()} ${profile.lastName.trim()}`.trim()}</Text>
          <Text style={styles.profileSub}>Keep your customer details up to date.</Text>
        </View>
        <Pressable
          style={styles.customerEditButton}
          onPress={() => {
            if (isEditing) {
              setDraft(profile);
              setIsEditing(false);
              return;
            }

            setDraft(profile);
            setIsEditing(true);
          }}
        >
          <Text style={styles.customerEditButtonText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </Pressable>
      </View>

      {isEditing ? (
        <View style={styles.customerEditStack}>
          <Pressable style={styles.photoCard} onPress={() => void handlePickPhoto()}>
            <View style={styles.photoPreview}>
              {draft.profilePhotoUrl ? (
                <Image source={{ uri: draft.profilePhotoUrl }} style={styles.photoPreviewImage} />
              ) : (
                <Text style={styles.photoPreviewText}>
                  {draft.firstName.trim().charAt(0).toUpperCase() || 'C'}
                </Text>
              )}
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Profile photo</Text>
              <Text style={styles.photoSubtitle}>
                {isPickingPhoto
                  ? 'Opening photo library...'
                  : draft.profilePhotoUrl
                    ? 'Tap to replace your selected photo.'
                    : 'Optional. Tap to choose from your gallery.'}
              </Text>
            </View>
          </Pressable>

          {draft.profilePhotoUrl ? (
            <Pressable
              style={styles.photoSecondaryAction}
              onPress={() =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        profilePhotoUrl: undefined,
                        profilePhotoBase64: undefined,
                        profilePhotoMimeType: undefined,
                      }
                    : current
                )
              }
            >
              <Text style={styles.photoSecondaryActionText}>Remove selected photo</Text>
            </Pressable>
          ) : null}

          <View style={styles.inputGroupLight}>
            <Text style={styles.inputLabelDark}>Email</Text>
            <TextInput
              value={draft.email ?? ''}
              onChangeText={(value) =>
                setDraft((current) => (current ? { ...current, email: value } : current))
              }
              style={styles.inputLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroupLight}>
            <Text style={styles.inputLabelDark}>First name *</Text>
            <TextInput
              value={draft.firstName}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, firstName: value } : current))}
              style={styles.inputLight}
            />
          </View>

          <View style={styles.inputGroupLight}>
            <Text style={styles.inputLabelDark}>Last name *</Text>
            <TextInput
              value={draft.lastName}
              onChangeText={(value) => setDraft((current) => (current ? { ...current, lastName: value } : current))}
              style={styles.inputLight}
            />
          </View>

          <View style={styles.inputGroupLight}>
            <Text style={styles.inputLabelDark}>Phone number</Text>
            <TextInput
              value={draft.phoneNumber ?? ''}
              onChangeText={(value) =>
                setDraft((current) => (current ? { ...current, phoneNumber: value } : current))
              }
              style={styles.inputLight}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroupLight}>
            <Text style={styles.inputLabelDark}>Date of birth</Text>
            <Pressable
              style={styles.inputPressableLight}
              onPress={() => {
                setDateOfBirthPickerValue(getInitialDate(draft.dateOfBirth));
                setShowDateOfBirthPicker((current) => !current);
              }}
            >
              <Text
                style={[
                  styles.inputPressableLightText,
                  !(draft.dateOfBirth ?? '').trim() && styles.inputPressableLightPlaceholder,
                ]}
              >
                {draft.dateOfBirth ? formatDateOfBirthLabel(draft.dateOfBirth) : 'Select date of birth'}
              </Text>
            </Pressable>
            {showDateOfBirthPicker ? (
              <DateTimePicker
                value={dateOfBirthPickerValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDateOfBirth}
                maximumDate={new Date()}
                onChange={handleDateOfBirthChange}
              />
            ) : null}
          </View>

          <Pressable style={styles.customerSaveButton} onPress={() => void handleSave()}>
            <Text style={styles.customerSaveButtonText}>Save profile</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.settingsList}>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Email: {profile.email?.trim() || 'Not available'}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>First name: {profile.firstName}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Last name: {profile.lastName}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Phone number: {profile.phoneNumber?.trim() || 'Not added'}</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>
              Date of birth: {profile.dateOfBirth?.trim() ? formatDateOfBirthLabel(profile.dateOfBirth) : 'Not added'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function AppPreferencesCard({
  preferences,
  isSaving,
  onTogglePreference,
  countryLabel,
}: {
  preferences: NotificationPreferences;
  isSaving: boolean;
  onTogglePreference: (key: NotificationPreferenceKey, value: boolean) => void;
  countryLabel?: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionEyebrow}>Settings</Text>
      <Text style={styles.sectionTitle}>App preferences</Text>
      <Text style={styles.vendorCopy}>
        Choose which updates should reach you first. Message alerts stay front and center.
      </Text>
      <View style={styles.settingsListDark}>
        <View style={styles.settingRowDark}>
          <Text style={styles.settingIcon}>🔔</Text>
          <View style={styles.settingCopyWrap}>
            <Text style={styles.settingTextDark}>Message notifications</Text>
            <Text style={styles.settingMetaDark}>Get notified as soon as a new conversation message comes in.</Text>
          </View>
          <Switch
            value={preferences.messageNotifications}
            onValueChange={(value) => onTogglePreference('messageNotifications', value)}
            disabled={isSaving}
            trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
            thumbColor={preferences.messageNotifications ? '#166534' : '#FFFFFF'}
          />
        </View>
        <View style={styles.settingRowDark}>
          <Text style={styles.settingIcon}>📍</Text>
          <View style={styles.settingCopyWrap}>
            <Text style={styles.settingTextDark}>Vendor updates</Text>
            <Text style={styles.settingMetaDark}>Receive route, live-status and nearby vendor activity updates.</Text>
          </View>
          <Switch
            value={preferences.vendorUpdates}
            onValueChange={(value) => onTogglePreference('vendorUpdates', value)}
            disabled={isSaving}
            trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
            thumbColor={preferences.vendorUpdates ? '#166534' : '#FFFFFF'}
          />
        </View>
        <View style={styles.settingRowDark}>
          <Text style={styles.settingIcon}>✨</Text>
          <View style={styles.settingCopyWrap}>
            <Text style={styles.settingTextDark}>Promotions and news</Text>
            <Text style={styles.settingMetaDark}>Receive launches, featured vendors and curated product updates.</Text>
          </View>
          <Switch
            value={preferences.marketingNotifications}
            onValueChange={(value) => onTogglePreference('marketingNotifications', value)}
            disabled={isSaving}
            trackColor={{ false: '#D8DEE8', true: '#86EFAC' }}
            thumbColor={preferences.marketingNotifications ? '#166534' : '#FFFFFF'}
          />
        </View>
        <View style={styles.settingRowDark}>
          <Text style={styles.settingIcon}>🌍</Text>
          <View style={styles.settingCopyWrap}>
            <Text style={styles.settingTextDark}>Language</Text>
            <Text style={styles.settingMetaDark}>English</Text>
          </View>
        </View>
        {countryLabel ? (
          <View style={styles.settingRowDark}>
            <Text style={styles.settingIcon}>🇳🇱</Text>
            <View style={styles.settingCopyWrap}>
              <Text style={styles.settingTextDark}>Country</Text>
              <Text style={styles.settingMetaDark}>{countryLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function formatLiveUpdate(updatedAt: string) {
  const parsedDate = new Date(updatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return updatedAt;
  }

  return parsedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ProfileScreen() {
  const { authRole, activeViewMode, signOut } = useAuth();
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileSetup | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfileSetup | null>(null);
  const [vendorLiveState, setVendorLiveState] = useState<VendorLiveState>({
    isLive: false,
    location: null,
  });
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isSavingNotificationPreferences, setIsSavingNotificationPreferences] = useState(false);
  const [isUpdatingLiveState, setIsUpdatingLiveState] = useState(false);
  const [wakeLockWarning, setWakeLockWarning] = useState<string | null>(null);
  const vendorLocationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const vendorWebWatchIdRef = useRef<number | null>(null);
  const screenWakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const isVendorView =
    authRole === 'vendor' || (authRole === 'admin' && activeViewMode === 'vendor');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadScreenData() {
        const [customer, profile, liveState, preferences] = await Promise.all([
          getCustomerProfile(),
          getVendorProfile(),
          getVendorLiveState(),
          getNotificationPreferences(),
        ]);

        if (isActive) {
          setCustomerProfile(customer);
          setVendorProfile(profile);
          setVendorLiveState(liveState);
          setNotificationPreferences(preferences);
        }
      }

      void loadScreenData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  async function handleNotificationPreferenceToggle(
    key: NotificationPreferenceKey,
    value: boolean
  ) {
    const previousPreferences = notificationPreferences;
    const nextPreferences = {
      ...notificationPreferences,
      [key]: value,
    };

    setNotificationPreferences(nextPreferences);
    setIsSavingNotificationPreferences(true);

    try {
      await saveNotificationPreferences(nextPreferences);
      if (key === 'messageNotifications' && value) {
        await registerDevicePushToken();
      }
    } catch {
      setNotificationPreferences(previousPreferences);
      Alert.alert(
        'Preference not saved',
        'Your notification preference could not be saved right now. Please try again.'
      );
    } finally {
      setIsSavingNotificationPreferences(false);
    }
  }

  useEffect(() => {
    if (!isVendorView || !vendorLiveState.isLive) {
      return;
    }

    let isMounted = true;

    function handleLivePosition(latitude: number, longitude: number) {
      if (!isMounted) {
        return;
      }

      const nextLiveState: VendorLiveState = {
        isLive: true,
        location: {
          latitude,
          longitude,
          updatedAt: new Date().toISOString(),
        },
      };

      setVendorLiveState(nextLiveState);
      void saveVendorLiveState(nextLiveState);
    }

    async function startWatchingPosition() {
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return;
          }

          vendorWebWatchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              handleLivePosition(position.coords.latitude, position.coords.longitude);
            },
            () => {},
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
            }
          );
          return;
        }

        vendorLocationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 15000,
            distanceInterval: 25,
          },
          (position) => {
            handleLivePosition(position.coords.latitude, position.coords.longitude);
          }
        );
      } catch {}
    }

    void startWatchingPosition();

    return () => {
      isMounted = false;
      vendorLocationSubscriptionRef.current?.remove();
      vendorLocationSubscriptionRef.current = null;

      if (
        vendorWebWatchIdRef.current !== null &&
        typeof navigator !== 'undefined' &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(vendorWebWatchIdRef.current);
        vendorWebWatchIdRef.current = null;
      }
    };
  }, [isVendorView, vendorLiveState.isLive]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isVendorView) {
      return;
    }

    async function releaseWakeLock() {
      if (!screenWakeLockRef.current) {
        return;
      }

      try {
        await screenWakeLockRef.current.release();
      } catch {}

      screenWakeLockRef.current = null;
    }

    async function requestWakeLock() {
      if (!vendorLiveState.isLive) {
        await releaseWakeLock();
        setWakeLockWarning(null);
        return;
      }

      const webNavigator = typeof navigator === 'undefined' ? null : (navigator as Navigator & {
        wakeLock?: {
          request: (type: 'screen') => Promise<WakeLockSentinelLike>;
        };
      });

      if (!webNavigator?.wakeLock?.request) {
        setWakeLockWarning(
          'Keep CocoFinder open and your phone unlocked while you are live. Your browser cannot keep the screen awake.'
        );
        return;
      }

      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      try {
        await releaseWakeLock();
        screenWakeLockRef.current = await webNavigator.wakeLock.request('screen');
        setWakeLockWarning(null);
      } catch {
        setWakeLockWarning(
          'Keep CocoFinder open and your phone unlocked while you are live. Your browser could not keep the screen awake.'
        );
      }
    }

    function handleVisibilityChange() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [isVendorView, vendorLiveState.isLive]);

  async function handleResetOnboarding() {
    try {
      await resetOnboarding();
      await signOut();
      Alert.alert(
        'Intro flow reset',
        'Onboarding and login flow have been reset. Your vendor profile and business data were kept.'
      );
    } catch {
      Alert.alert('Reset failed', 'The onboarding flow could not be reset. Please try again.');
    }
  }

  async function handleLiveToggle(nextValue: boolean) {
    if (!isVendorView) {
      return;
    }

    if (!vendorProfile) {
      Alert.alert(
        'Vendor profile required',
        'Complete your vendor profile before you go live.'
      );
      return;
    }

    setIsUpdatingLiveState(true);

    try {
      if (!nextValue) {
        vendorLocationSubscriptionRef.current?.remove();
        vendorLocationSubscriptionRef.current = null;

        if (
          vendorWebWatchIdRef.current !== null &&
          typeof navigator !== 'undefined' &&
          navigator.geolocation
        ) {
          navigator.geolocation.clearWatch(vendorWebWatchIdRef.current);
          vendorWebWatchIdRef.current = null;
        }

        if (screenWakeLockRef.current) {
          try {
            await screenWakeLockRef.current.release();
          } catch {}
          screenWakeLockRef.current = null;
        }

        setWakeLockWarning(null);

        const offlineState: VendorLiveState = {
          isLive: false,
          location: vendorLiveState.location,
        };
        await saveVendorLiveState(offlineState);
        setVendorLiveState(offlineState);
        showInfoMessage('Go Offline', 'Live location sharing has been turned off.');
        return;
      }

      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          showInfoMessage(
            'Location unavailable',
            'This browser does not support live location sharing.'
          );
          return;
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000,
          });
        });

        const liveState: VendorLiveState = {
          isLive: true,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updatedAt: new Date().toISOString(),
          },
        };

        await saveVendorLiveState(liveState);
        setVendorLiveState(liveState);
        setWakeLockWarning(null);
        showInfoMessage('Go Live', 'You are now live and visible to customers on the map.');
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        Alert.alert(
          'Location needed',
          'Turn on GPS on your phone to share your live location with customers.'
        );
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Allow location access so customers can find your live position on the map.'
        );
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const liveState: VendorLiveState = {
        isLive: true,
        location: {
          latitude: currentPosition.coords.latitude,
          longitude: currentPosition.coords.longitude,
          updatedAt: new Date().toISOString(),
        },
      };

      await saveVendorLiveState(liveState);
      setVendorLiveState(liveState);
      setWakeLockWarning(null);
      showInfoMessage('Go Live', 'You are now live and visible to customers on the map.');
    } catch {
      showInfoMessage(
        'Could not go live',
        'We need GPS access to share your live location. Please try again.'
      );
    } finally {
      setIsUpdatingLiveState(false);
    }
  }

  function handleVendorLogout() {
    const performLogout = async () => {
      try {
        const offlineState: VendorLiveState = {
          isLive: false,
          location: vendorLiveState.location,
        };

        await saveVendorLiveState(offlineState);
        setVendorLiveState(offlineState);
        await signOut();
      } catch {
        Alert.alert('Log out failed', 'We could not log you out right now. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if (!confirmInBrowser('Log out', 'Are you sure you want to log out?')) {
        return;
      }

      void performLogout();
      return;
    }

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  }

  function handleCustomerLogout() {
    const performLogout = async () => {
      try {
        await signOut();
      } catch {
        Alert.alert('Log out failed', 'We could not log you out right now. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if (!confirmInBrowser('Log out', 'Are you sure you want to log out?')) {
        return;
      }

      void performLogout();
      return;
    }

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  }

  function handleCloseCustomerAccount() {
    if (Platform.OS === 'web') {
      const shouldContinue = confirmInBrowser(
        'Close your account?',
        'This action cannot be undone. All your data will be permanently deleted.'
      );

      if (!shouldContinue) {
        return;
      }

      const shouldDelete = confirmInBrowser(
        'Final confirmation',
        'Are you sure you want to permanently close your customer account?'
      );

      if (!shouldDelete) {
        return;
      }

      void (async () => {
        try {
          await clearCustomerLocalCache();
          setCustomerProfile(null);
          await signOut();
        } catch {
          showInfoMessage(
            'Delete account failed',
            'We could not close your account right now. Please try again.'
          );
        }
      })();
      return;
    }

    Alert.alert(
      'Close your account?',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Are you sure you want to permanently close your customer account?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      try {
                        await clearCustomerLocalCache();
                        setCustomerProfile(null);
                        await signOut();
                      } catch {
                        Alert.alert(
                          'Delete account failed',
                          'We could not close your account right now. Please try again.'
                        );
                      }
                    })();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function handleCloseVendorAccount() {
    if (Platform.OS === 'web') {
      const shouldContinue = confirmInBrowser(
        'Close your account?',
        'This action cannot be undone. All your data will be permanently deleted.'
      );

      if (!shouldContinue) {
        return;
      }

      const shouldDelete = confirmInBrowser(
        'Final confirmation',
        'Are you sure you want to permanently close your vendor account?'
      );

      if (!shouldDelete) {
        return;
      }

      void (async () => {
        try {
          setIsUpdatingLiveState(true);
          setVendorLiveState({
            isLive: false,
            location: null,
          });
          await clearVendorLiveState();
          await clearVendorProfile();
          setVendorProfile(null);
          await signOut();
        } catch {
          showInfoMessage(
            'Delete account failed',
            'We could not close your account right now. Please try again.'
          );
        } finally {
          setIsUpdatingLiveState(false);
        }
      })();
      return;
    }

    Alert.alert(
      'Close your account?',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Are you sure you want to permanently close your vendor account?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      try {
                        setIsUpdatingLiveState(true);
                        setVendorLiveState({
                          isLive: false,
                          location: null,
                        });
                        await clearVendorLiveState();
                        await clearVendorProfile();
                        setVendorProfile(null);
                        await signOut();
                      } catch {
                        Alert.alert(
                          'Delete account failed',
                          'We could not close your account right now. Please try again.'
                        );
                      } finally {
                        setIsUpdatingLiveState(false);
                      }
                    })();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, Platform.OS === 'web' && styles.contentWeb]}
      >
        {isVendorView ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Vendor</Text>
              <Text style={styles.heroGreeting}>
                Hey, {vendorProfile?.firstName?.trim() || 'Michaello'}!
              </Text>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopyWrap}>
                  <Text style={styles.copy}>
                    This is your vendor control center. Review your business, products and live visibility.
                  </Text>
                </View>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {vendorProfile?.firstName?.trim()?.charAt(0).toUpperCase() || 'M'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.liveCard}>
              <View style={styles.liveCardTop}>
                <View style={styles.liveCardCopy}>
                  <Text style={styles.liveTitle}>Live location sharing</Text>
                  <Text style={styles.liveCopy}>
                    Turn on live mode so customers can find and track your current location.
                  </Text>
                </View>
                <Switch
                  value={vendorLiveState.isLive}
                  onValueChange={(value) => void handleLiveToggle(value)}
                  disabled={isUpdatingLiveState}
                  trackColor={{ false: '#334155', true: '#86EFAC' }}
                  thumbColor={vendorLiveState.isLive ? '#166534' : '#E2E8F0'}
                />
              </View>

              <View style={styles.liveStatusRow}>
                <View
                  style={[
                    styles.liveStatusBadge,
                    vendorLiveState.isLive ? styles.liveStatusBadgeOn : styles.liveStatusBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.liveStatusText,
                      vendorLiveState.isLive ? styles.liveStatusTextOn : styles.liveStatusTextOff,
                    ]}
                  >
                    {vendorLiveState.isLive ? 'Live now' : 'Offline'}
                  </Text>
                </View>
                <Text style={styles.liveMeta}>
                  {vendorLiveState.location
                    ? `Last GPS update ${formatLiveUpdate(vendorLiveState.location.updatedAt)}`
                    : 'No live GPS update yet'}
                </Text>
              </View>

              <Text style={styles.liveHint}>
                {vendorLiveState.isLive
                  ? 'Your current device location is now used as your live map position.'
                  : 'Go live to appear on the customer map. Offline vendors are hidden from nearby discovery.'}
              </Text>
              {vendorLiveState.isLive && wakeLockWarning ? (
                <Text style={styles.liveWarning}>{wakeLockWarning}</Text>
              ) : null}
            </View>

            <VendorProfileEditor
              initialProfile={vendorProfile}
              vendorLiveState={vendorLiveState}
              notificationPreferences={notificationPreferences}
              isSavingNotificationPreferences={isSavingNotificationPreferences}
              onToggleNotificationPreference={handleNotificationPreferenceToggle}
            />

            <View style={styles.logoutCard}>
              <Text style={styles.logoutEyebrow}>Security</Text>
              <Text style={styles.logoutTitle}>Log out</Text>
              <Text style={styles.logoutCopy}>
                Sign out safely from this device. If you are live now, your location sharing will stop automatically.
              </Text>
              <Pressable style={styles.logoutButton} onPress={handleVendorLogout}>
                <Text style={styles.logoutButtonIcon}>↪</Text>
                <Text style={styles.logoutButtonText}>Log out</Text>
              </Pressable>
            </View>

            <View style={styles.closeAccountCard}>
              <Text style={styles.closeAccountEyebrow}>Danger zone</Text>
              <Text style={styles.closeAccountTitle}>Close account</Text>
              <Text style={styles.closeAccountCopy}>
                Permanently delete your vendor account and remove your business from the app.
              </Text>
              <Pressable style={styles.closeAccountButton} onPress={handleCloseVendorAccount}>
                <TrashOutlineIcon />
                <Text style={styles.closeAccountButtonText}>Close account</Text>
              </Pressable>
            </View>

            <View style={styles.devCard}>
              <Text style={styles.devEyebrow}>Testing</Text>
              <Text style={styles.devTitle}>Replay onboarding</Text>
              <Text style={styles.devCopy}>
                Reset onboarding and login for a fresh test run without deleting your vendor profile or business data.
              </Text>
              <Pressable style={styles.devButton} onPress={() => void handleResetOnboarding()}>
                <Text style={styles.devButtonText}>Reset intro flow</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Customer</Text>
              <Text style={styles.heroGreeting}>
                Hey, {customerProfile?.firstName?.trim() || 'Customer'}!
              </Text>
              <Text style={styles.copy}>
                Profile is the long-term home for account, permissions, and preferences.
              </Text>
            </View>

            <CustomerProfileEditor initialProfile={customerProfile} />

            <AppPreferencesCard
              preferences={notificationPreferences}
              isSaving={isSavingNotificationPreferences}
              onTogglePreference={handleNotificationPreferenceToggle}
            />

            <View style={styles.logoutCard}>
              <Text style={styles.logoutEyebrow}>Security</Text>
              <Text style={styles.logoutTitle}>Log out</Text>
              <Text style={styles.logoutCopy}>
                Sign out safely from this device and return to the account entry flow.
              </Text>
              <Pressable style={styles.logoutButton} onPress={handleCustomerLogout}>
                <Text style={styles.logoutButtonIcon}>↪</Text>
                <Text style={styles.logoutButtonText}>Log out</Text>
              </Pressable>
            </View>

            <View style={styles.closeAccountCard}>
              <Text style={styles.closeAccountEyebrow}>Danger zone</Text>
              <Text style={styles.closeAccountTitle}>Close account</Text>
              <Text style={styles.closeAccountCopy}>
                Permanently delete your customer account and remove your profile from the app.
              </Text>
              <Pressable style={styles.closeAccountButton} onPress={handleCloseCustomerAccount}>
                <TrashOutlineIcon />
                <Text style={styles.closeAccountButtonText}>Close account</Text>
              </Pressable>
            </View>

            <View style={styles.devCard}>
              <Text style={styles.devEyebrow}>Testing</Text>
              <Text style={styles.devTitle}>Replay onboarding</Text>
              <Text style={styles.devCopy}>
                Reset the first-run intro so you can preview the onboarding flow again.
              </Text>
              <Pressable style={styles.devButton} onPress={() => void handleResetOnboarding()}>
                <Text style={styles.devButtonText}>Reset onboarding</Text>
              </Pressable>
            </View>
          </>
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
  contentWeb: {
    // The web tab bar is absolutely positioned above the page content, so
    // the profile footer needs extra space to stay fully tappable.
    paddingBottom: 150,
  },
  hero: {
    backgroundColor: '#F6ECDF',
    borderRadius: 30,
    padding: 20,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  heroLabel: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  heroCopyWrap: {
    flex: 1,
  },
  heroGreeting: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
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
  profileCard: {
    backgroundColor: '#F5F1E8',
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  customerAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  customerProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  customerProfileHeaderCopy: {
    flex: 1,
  },
  customerEditButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  customerEditButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  customerEditStack: {
    marginTop: 18,
    gap: 14,
  },
  profileName: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  profileSub: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 21,
  },
  settingsList: {
    marginTop: 18,
    gap: 10,
  },
  settingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingText: {
    color: '#334155',
    fontWeight: '700',
  },
  inputGroupLight: {
    gap: 8,
  },
  inputLabelDark: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0F172A',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLightReadOnly: {
    color: '#64748B',
    backgroundColor: '#F8FAFC',
  },
  inputPressableLight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputPressableLightText: {
    color: '#0F172A',
    fontSize: 15,
  },
  inputPressableLightPlaceholder: {
    color: '#94A3B8',
  },
  customerSaveButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#111827',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  photoCopy: {
    flex: 1,
    gap: 4,
  },
  photoTitle: {
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '800',
  },
  photoSubtitle: {
    color: '#7C2D12',
    fontSize: 13,
    lineHeight: 18,
  },
  photoSecondaryAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
  photoSecondaryActionText: {
    color: '#C2410C',
    fontSize: 13,
    fontWeight: '700',
  },
  vendorCard: {
    backgroundColor: '#F7F4ED',
    borderRadius: 30,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  vendorStack: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#F7F4ED',
    borderRadius: 30,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
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
    fontSize: 26,
    fontWeight: '900',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  collapseHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  collapseIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
  },
  collapsedSummary: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  liveCard: {
    backgroundColor: '#EAF6EE',
    borderRadius: 30,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.14)',
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  liveCardTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  liveCardCopy: {
    flex: 1,
  },
  liveTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  liveCopy: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 21,
  },
  liveStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  liveStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveStatusBadgeOn: {
    backgroundColor: '#DCFCE7',
  },
  liveStatusBadgeOff: {
    backgroundColor: '#E2E8F0',
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  liveStatusTextOn: {
    color: '#166534',
  },
  liveStatusTextOff: {
    color: '#475569',
  },
  liveMeta: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  liveHint: {
    color: '#334155',
    lineHeight: 21,
  },
  liveWarning: {
    color: '#9A3412',
    lineHeight: 21,
    fontWeight: '700',
  },
  vendorHeaderRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  vendorHeaderCopy: {
    flex: 1,
  },
  vendorEyebrow: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  vendorTitle: {
    marginTop: 6,
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  vendorCopy: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 21,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editButtonActive: {
    backgroundColor: '#FDE68A',
  },
  editButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  editButtonTextActive: {
    color: '#92400E',
  },
  vendorBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  blockLabel: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  vendorIdentityRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  vendorLogoBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F6ECDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorLogoText: {
    fontSize: 26,
  },
  vendorIdentityCopy: {
    flex: 1,
  },
  blockTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '800',
  },
  blockText: {
    color: '#475569',
    lineHeight: 21,
  },
  settingsListDark: {
    gap: 10,
  },
  settingRowDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingCopyWrap: {
    flex: 1,
  },
  settingTextDark: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  settingMetaDark: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  productEditorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  productEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productEditorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  productIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F6ECDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productIconBubbleText: {
    fontSize: 18,
  },
  productEditorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productSortText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  removeProductText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
  },
  inlineActionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  availabilityToggle: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F1ECE3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  availabilityToggleActive: {
    backgroundColor: '#DCFCE7',
  },
  availabilityToggleText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  availabilityToggleTextActive: {
    color: '#166534',
  },
  formStack: {
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formRowMain: {
    flex: 1,
  },
  formRowSide: {
    width: 120,
  },
  profileInput: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DDCF',
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 14,
    color: '#111827',
    fontSize: 15,
  },
  profilePickerWrap: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DDCF',
    backgroundColor: '#FFFDF8',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profilePicker: {
    color: '#111827',
  },
  profileTextArea: {
    minHeight: 118,
    paddingTop: 14,
    paddingBottom: 14,
  },
  saveButton: {
    marginTop: 2,
    backgroundColor: palette.mint,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  supportCard: {
    backgroundColor: '#F6ECDF',
    borderRadius: 30,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  supportCopyWrap: {
    flex: 1,
    gap: 6,
  },
  supportText: {
    color: '#475569',
    lineHeight: 21,
  },
  supportIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportIcon: {
    fontSize: 30,
  },
  devCard: {
    backgroundColor: '#F5F1E8',
    borderRadius: 30,
    padding: 20,
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
  devEyebrow: {
    color: palette.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  devTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  devCopy: {
    color: '#475569',
    lineHeight: 21,
  },
  devButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: palette.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  devButtonText: {
    color: palette.cloud,
    fontSize: 13,
    fontWeight: '800',
  },
  logoutCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 30,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.18)',
  },
  logoutEyebrow: {
    color: '#FDA4AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  logoutTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  logoutCopy: {
    color: '#9F1239',
    lineHeight: 21,
  },
  logoutButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  logoutButtonIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  closeAccountCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 30,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.20)',
  },
  closeAccountEyebrow: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  closeAccountTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  closeAccountCopy: {
    color: '#991B1B',
    lineHeight: 21,
  },
  closeAccountButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  closeAccountButtonText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '800',
  },
  trashIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIconLid: {
    position: 'absolute',
    top: 2,
    width: 12,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#FCA5A5',
  },
  trashIconHandle: {
    position: 'absolute',
    top: 0,
    width: 6,
    height: 3,
    borderWidth: 1.4,
    borderBottomWidth: 0,
    borderColor: '#FCA5A5',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'transparent',
  },
  trashIconBody: {
    position: 'absolute',
    top: 5,
    width: 10,
    height: 10,
    borderWidth: 1.6,
    borderColor: '#FCA5A5',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  trashIconLine: {
    width: 1.4,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#FCA5A5',
  },
});
