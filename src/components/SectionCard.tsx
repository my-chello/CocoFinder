import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../config/theme';

type SectionCardProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  tone?: 'dark' | 'light';
}>;

export function SectionCard({
  children,
  eyebrow,
  title,
  tone = 'dark',
}: SectionCardProps) {
  const isDark = tone === 'dark';

  return (
    <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.title, isDark ? styles.titleDark : styles.titleLight]}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
  },
  cardDark: {
    backgroundColor: palette.panel,
  },
  cardLight: {
    backgroundColor: palette.sand,
  },
  eyebrow: {
    color: palette.mint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
  },
  titleDark: {
    color: palette.cloud,
  },
  titleLight: {
    color: palette.ink,
  },
  body: {
    marginTop: 14,
    gap: 12,
  },
});
