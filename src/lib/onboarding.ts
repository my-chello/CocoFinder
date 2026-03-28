import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_STORAGE_KEY = 'cocofinder:onboarding-complete';

export async function hasCompletedOnboarding() {
  const storedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return storedValue === 'true';
}

export async function completeOnboarding() {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

export async function resetOnboarding() {
  await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
}
