import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { palette } from '../config/theme';

export function ScreenContainer({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 20,
  },
});
