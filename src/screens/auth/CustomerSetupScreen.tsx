import { useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
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
import type { CustomerProfileSetup } from '../../lib/customerProfile';

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

function getInitialDate(value: string) {
  const parsedDate = value ? new Date(value) : new Date('2000-01-01');

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date('2000-01-01');
  }

  return parsedDate;
}

const minimumDateOfBirth = new Date('1900-01-01');

function normalizeWebDateInput(value: string) {
  const digits = value.replace(/[^\d]/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function isValidStoredDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsedDate = new Date(value);
  return !Number.isNaN(parsedDate.getTime());
}

function parseWebDateInput(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d{2}-\d{2}-\d{4}$/.test(trimmedValue)) {
    return null;
  }

  const [day, month, year] = trimmedValue.split('-');
  const storedValue = `${year}-${month}-${day}`;

  if (!isValidStoredDate(storedValue)) {
    return null;
  }

  return storedValue;
}

export function CustomerSetupScreen({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (profile: CustomerProfileSetup) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateOfBirthPickerValue, setDateOfBirthPickerValue] = useState<Date>(getInitialDate(''));
  const [showDateOfBirthPicker, setShowDateOfBirthPicker] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoBase64, setProfilePhotoBase64] = useState('');
  const [profilePhotoMimeType, setProfilePhotoMimeType] = useState('');
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  const isComplete =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneNumber.trim().length > 0 &&
    dateOfBirth.trim().length > 0;

  function handleSubmit() {
    const normalizedDateOfBirth =
      Platform.OS === 'web' ? parseWebDateInput(dateOfBirth) : dateOfBirth.trim();

    if (!isComplete) {
      Alert.alert(
        'Complete customer setup',
        'Please fill in your first name, last name, phone number, and date of birth to continue.'
      );
      return;
    }

    if (!normalizedDateOfBirth || !isValidStoredDate(normalizedDateOfBirth)) {
      Alert.alert(
        'Invalid date of birth',
        Platform.OS === 'web'
          ? 'Use the format DD-MM-YYYY for your date of birth.'
          : 'Please choose a valid date of birth to continue.'
      );
      return;
    }

    onComplete({
      email: undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      dateOfBirth: normalizedDateOfBirth || undefined,
      profilePhotoUrl: profilePhotoUrl.trim() || undefined,
      profilePhotoBase64: profilePhotoBase64.trim() || undefined,
      profilePhotoMimeType: profilePhotoMimeType.trim() || undefined,
    });
  }

  async function handlePickProfilePhoto() {
    try {
      setIsPickingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow photo library access to choose a profile photo.'
        );
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

      setProfilePhotoUrl(result.assets[0].uri);
      setProfilePhotoBase64(result.assets[0].base64 ?? '');
      setProfilePhotoMimeType(result.assets[0].mimeType ?? '');
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
    setDateOfBirth(toStoredDateValue(selectedDate));
  }

  function handleOpenDateOfBirthPicker() {
    setDateOfBirthPickerValue(getInitialDate(dateOfBirth));
    setShowDateOfBirthPicker(true);
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
            <Text style={styles.panelTitle}>Finish Customer Setup</Text>
            <Text style={styles.panelCopy}>
              Add your details to complete your account and start discovering nearby vendors.
            </Text>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable style={styles.photoCard} onPress={() => void handlePickProfilePhoto()}>
                <View style={styles.photoPreview}>
                  {profilePhotoUrl ? (
                    <Image source={{ uri: profilePhotoUrl }} style={styles.photoPreviewImage} />
                  ) : (
                    <Text style={styles.photoPreviewText}>
                      {firstName.trim().charAt(0).toUpperCase() || lastName.trim().charAt(0).toUpperCase() || 'C'}
                    </Text>
                  )}
                </View>
                <View style={styles.photoCopy}>
                  <Text style={styles.photoTitle}>Profile photo</Text>
                  <Text style={styles.photoSubtitle}>
                    {isPickingPhoto
                      ? 'Opening photo library...'
                      : profilePhotoUrl
                        ? 'Tap to replace your selected photo.'
                        : 'Optional during setup. Tap to choose from your gallery.'}
                  </Text>
                </View>
              </Pressable>

              {profilePhotoUrl ? (
                <Pressable style={styles.photoSecondaryAction} onPress={() => setProfilePhotoUrl('')}>
                  <Text style={styles.photoSecondaryActionText}>Remove selected photo</Text>
                </Pressable>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First name *</Text>
                <Text style={styles.inputHint}>Enter the first name you want to show in your profile.</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last name *</Text>
                <Text style={styles.inputHint}>Add your last name to complete your account details.</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone number *</Text>
                <Text style={styles.inputHint}>Add your phone number to complete your account details.</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of birth *</Text>
                <Text style={styles.inputHint}>
                  {Platform.OS === 'web'
                    ? 'Enter your date of birth as DD-MM-YYYY.'
                    : 'Select your date of birth using the native date picker.'}
                </Text>
                {Platform.OS === 'web' ? (
                  <TextInput
                    value={dateOfBirth}
                    onChangeText={(value) => setDateOfBirth(normalizeWebDateInput(value))}
                    placeholder="DD-MM-YYYY"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                ) : (
                  <>
                    <Pressable
                      style={styles.inputPressable}
                      onPress={handleOpenDateOfBirthPicker}
                    >
                      <Text style={[styles.inputPressableText, !dateOfBirth && styles.inputPressablePlaceholder]}>
                        {dateOfBirth ? formatDateOfBirthLabel(dateOfBirth) : 'Select date of birth'}
                      </Text>
                    </Pressable>
                    {showDateOfBirthPicker ? (
                      <View style={styles.datePickerWrap}>
                        <DateTimePicker
                          value={dateOfBirthPickerValue}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          minimumDate={minimumDateOfBirth}
                          maximumDate={new Date()}
                          onChange={handleDateOfBirthChange}
                        />
                        {Platform.OS === 'ios' ? (
                          <Pressable
                            style={styles.datePickerDoneButton}
                            onPress={() => setShowDateOfBirthPicker(false)}
                          >
                            <Text style={styles.datePickerDoneButtonText}>Done</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </>
                )}
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
                Finish customer setup
              </Text>
            </Pressable>

            {!isComplete ? (
              <Text style={styles.submitHelperText}>
                Fill in all required fields to complete your customer profile.
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
    fontSize: 32,
    fontWeight: '900',
  },
  panelCopy: {
    marginTop: 10,
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  formScroll: {
    flex: 1,
    marginTop: 22,
  },
  formContent: {
    gap: 16,
    paddingBottom: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  inputHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0F172A',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputPressable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputPressableText: {
    color: '#0F172A',
    fontSize: 15,
  },
  inputPressablePlaceholder: {
    color: '#94A3B8',
  },
  datePickerWrap: {
    gap: 10,
    paddingTop: 4,
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  datePickerDoneButtonText: {
    color: '#C2410C',
    fontSize: 13,
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
  submitButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  submitButtonPending: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  submitButtonTextPending: {
    color: '#6B7280',
  },
  submitHelperText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});
