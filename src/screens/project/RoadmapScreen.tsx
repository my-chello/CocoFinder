import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionCard } from '../../components/SectionCard';
import { env } from '../../config/env';

const roadmap = [
  {
    phase: 'Phase 1',
    title: 'Pilot one city',
    points: 'Live map, vendor onboarding, favorites, alerts, and admin approval.',
  },
  {
    phase: 'Phase 2',
    title: 'Regional growth',
    points: 'Reviews, promotions, analytics, and smarter notification targeting.',
  },
  {
    phase: 'Phase 3',
    title: 'International scale',
    points: 'Localization, multi-currency, compliance hardening, and enterprise tools.',
  },
];

export function RoadmapScreen() {
  return (
    <ScreenContainer>
      <SectionCard eyebrow="Backend Readiness" title="Supabase scaffold">
        <Text style={styles.copy}>
          Environment variables are wired in and the client is ready to swap from
          placeholder mode to a real Supabase project.
        </Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Supabase status</Text>
          <Text style={styles.statusValue}>
            {env.hasSupabase ? 'Configured' : 'Waiting for EXPO_PUBLIC credentials'}
          </Text>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Launch Plan" title="Roadmap already anchored" tone="light">
        {roadmap.map((item) => (
          <View key={item.phase} style={styles.roadmapRow}>
            <Text style={styles.phase}>{item.phase}</Text>
            <Text style={styles.roadmapTitle}>{item.title}</Text>
            <Text style={styles.roadmapCopy}>{item.points}</Text>
          </View>
        ))}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: '#B7C4D8',
    fontSize: 14,
    lineHeight: 22,
  },
  statusBox: {
    backgroundColor: '#20324B',
    borderRadius: 20,
    padding: 16,
  },
  statusLabel: {
    color: '#7EE0B7',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusValue: {
    color: '#F7F8FC',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  roadmapRow: {
    gap: 4,
  },
  phase: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  roadmapTitle: {
    color: '#18212F',
    fontSize: 18,
    fontWeight: '800',
  },
  roadmapCopy: {
    color: '#475569',
    lineHeight: 21,
  },
});
