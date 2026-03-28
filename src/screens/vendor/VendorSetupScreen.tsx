import { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VendorOpeningHoursEditor } from '../../components/VendorOpeningHoursEditor';
import { COUNTRY_OPTIONS, normalizeCountryName } from '../../lib/countries';
import { formatPriceForCountry } from '../../lib/currency';
import { VENDOR_CATEGORY_OPTIONS } from '../../lib/vendorCategories';
import {
  createEmptyVendorOpeningHoursRow,
  getVendorOpeningHoursSummary,
  type VendorOpeningHoursRow,
} from '../../lib/vendorOpeningHours';
import type { VendorProfileSetup } from '../../lib/vendorProfile';

export function VendorSetupScreen({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (profile: VendorProfileSetup) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [logoSymbol, setLogoSymbol] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHoursRows, setOpeningHoursRows] = useState<VendorOpeningHoursRow[]>([
    createEmptyVendorOpeningHoursRow(),
  ]);
  const [firstProductName, setFirstProductName] = useState('');
  const [firstProductPrice, setFirstProductPrice] = useState('');
  const [about, setAbout] = useState('');
  const [isResolvingCountry, setIsResolvingCountry] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function resolveInitialCountry() {
      try {
        const currentPermission = await Location.getForegroundPermissionsAsync();
        let permissionStatus = currentPermission.status;

        if (permissionStatus === 'undetermined') {
          const requestedPermission = await Location.requestForegroundPermissionsAsync();
          permissionStatus = requestedPermission.status;
        }

        if (permissionStatus === 'granted') {
          const lastKnownPosition = await Location.getLastKnownPositionAsync();
          const position =
            lastKnownPosition ??
            (await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }));

          if (position) {
            const placemarks = await Location.reverseGeocodeAsync({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            const detectedCountry = normalizeCountryName(placemarks[0]?.country);

            if (detectedCountry && isMounted) {
              setCountry((current) => current.trim() || detectedCountry);
            }
          }
        }
      } catch {
        // Fall back to a sensible default below when location is unavailable.
      } finally {
        if (isMounted) {
          setCountry((current) => current.trim() || 'Netherlands');
          setIsResolvingCountry(false);
        }
      }
    }

    void resolveInitialCountry();

    return () => {
      isMounted = false;
    };
  }, []);

  const openingHours = getVendorOpeningHoursSummary(openingHoursRows);

  const isComplete =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    businessName.trim().length > 0 &&
    logoSymbol.trim().length > 0 &&
    category.trim().length > 0 &&
    country.trim().length > 0 &&
    phone.trim().length > 0 &&
    openingHours.trim().length > 0 &&
    firstProductName.trim().length > 0 &&
    firstProductPrice.trim().length > 0 &&
    about.trim().length > 0;

  const missingFields = [
    !firstName.trim() ? 'First name' : null,
    !lastName.trim() ? 'Last name' : null,
    !businessName.trim() ? 'Business name' : null,
    !logoSymbol.trim() ? 'Logo symbol' : null,
    !category.trim() ? 'Category' : null,
    !country.trim() ? 'Country' : null,
    !phone.trim() ? 'Phone' : null,
    !openingHours.trim() ? 'Opening times' : null,
    !firstProductName.trim() ? 'First product' : null,
    !firstProductPrice.trim() ? 'Price' : null,
    !about.trim() ? 'About' : null,
  ].filter(Boolean) as string[];

  function handleSubmit() {
    if (!isComplete) {
      Alert.alert(
        'Complete vendor setup',
        `Please fill in: ${missingFields.join(', ')}`
      );
      return;
    }

    onComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      businessName: businessName.trim(),
      logoSymbol: logoSymbol.trim(),
      category: category.trim(),
      country: country.trim(),
      phone: phone.trim(),
      openingHours,
      openingHoursRows,
      firstProductName: firstProductName.trim(),
      firstProductPrice: formatPriceForCountry(country.trim(), firstProductPrice.trim()),
      about: about.trim(),
      products: [
        {
          id: 'vendor-product-primary',
          name: firstProductName.trim(),
          priceLabel: formatPriceForCountry(country.trim(), firstProductPrice.trim()),
          isAvailable: true,
          imageSymbol: logoSymbol.trim(),
        },
      ],
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <Text style={styles.brandEmoji}>🛺</Text>
            <Text style={styles.brandText}>COCO FINDER</Text>
          </View>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.modeBadge}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.illustrationWrap}>
          <View style={styles.panelBack} />
          <View style={styles.panelFront}>
            <Pressable style={styles.inlineBackButton} onPress={onBack} hitSlop={12}>
              <Text style={styles.inlineBackText}>← Back</Text>
            </Pressable>
            <Text style={styles.panelTitle}>Become a Vendor</Text>
            <Text style={styles.panelCopy}>
              Set up your profile to go live and start reaching nearby customers.
            </Text>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.rowItem]}>
                  <Text style={styles.inputLabel}>First name</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Michaello"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, styles.rowItem]}>
                  <Text style={styles.inputLabel}>Last name</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Jansen"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business name</Text>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Cocero"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Logo symbol</Text>
                <TextInput
                  value={logoSymbol}
                  onChangeText={setLogoSymbol}
                  placeholder="🥥"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={category}
                    onValueChange={(value) => setCategory(String(value))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a category" value="" />
                    {VENDOR_CATEGORY_OPTIONS.map((option) => (
                      <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={country}
                    onValueChange={(value) => setCountry(String(value))}
                    style={styles.picker}
                    enabled={!isResolvingCountry}
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+31 6 12345678"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Opening times</Text>
                <VendorOpeningHoursEditor rows={openingHoursRows} onChange={setOpeningHoursRows} />
                <Text style={styles.helperText}>
                  Add one or more schedule rows like `Mon-Fri 08:00-17:00`.
                </Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.rowItem]}>
                  <Text style={styles.inputLabel}>First product</Text>
                  <TextInput
                    value={firstProductName}
                    onChangeText={setFirstProductName}
                    placeholder="Fresh Coconut Water"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, styles.rowItemSmall]}>
                  <Text style={styles.inputLabel}>Price</Text>
                  <TextInput
                  value={firstProductPrice}
                  onChangeText={setFirstProductPrice}
                  placeholder="5.50"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>About</Text>
                <TextInput
                  value={about}
                  onChangeText={setAbout}
                  placeholder="Tell customers what you sell and what makes you special."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.textArea]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <Pressable
              style={[styles.submitButton, !isComplete && styles.submitButtonPending]}
              onPress={handleSubmit}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  !isComplete && styles.submitButtonTextPending,
                ]}
              >
                Create vendor profile
              </Text>
            </Pressable>

            {!isComplete ? (
              <Text style={styles.submitHelperText}>
                Fill in all fields to finish your vendor profile.
              </Text>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6ECDF',
  },
  keyboardAvoider: {
    flex: 1,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmoji: {
    fontSize: 22,
  },
  brandText: {
    color: '#573226',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeBadge: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  illustrationWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  panelBack: {
    position: 'absolute',
    top: 78,
    left: 42,
    right: 42,
    bottom: 54,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  panelFront: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 12,
  },
  inlineBackButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  inlineBackText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },
  panelTitle: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '800',
  },
  panelCopy: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 25,
  },
  formScroll: {
    flex: 1,
    marginTop: 22,
  },
  formContent: {
    gap: 16,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  rowItemSmall: {
    width: 120,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#111827',
    fontSize: 16,
  },
  pickerWrap: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    color: '#111827',
  },
  textArea: {
    minHeight: 128,
    paddingTop: 16,
    paddingBottom: 16,
  },
  helperText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: '#2D9BF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  submitButtonPending: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  submitButtonTextPending: {
    color: '#EFF6FF',
  },
  submitHelperText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
