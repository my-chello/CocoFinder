import { StyleSheet, Text, View } from 'react-native';
import { palette } from '../config/theme';
import type { Vendor } from '../types/vendor';

type VendorCardProps = {
  vendor: Vendor;
  isFavorite?: boolean;
};

export function VendorCard({ vendor, isFavorite = false }: VendorCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.name}>{vendor.name}</Text>
          <Text style={styles.meta}>
            {vendor.category} · {vendor.distanceKm} km away
          </Text>
        </View>
        <View style={vendor.isOpen ? styles.openBadge : styles.closedBadge}>
          <Text style={vendor.isOpen ? styles.openText : styles.closedText}>
            {vendor.isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{vendor.description}</Text>

      <View style={styles.metrics}>
        <Text style={styles.metric}>Rating {vendor.rating.toFixed(1)}</Text>
        <Text style={styles.metric}>ETA {vendor.eta}</Text>
        <Text style={styles.metric}>{vendor.priceHint}</Text>
        {isFavorite ? <Text style={styles.favorite}>Favorite</Text> : null}
      </View>

      <View style={styles.tags}>
        {vendor.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.cloud,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  identity: {
    flex: 1,
  },
  name: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  meta: {
    color: '#536072',
    fontSize: 13,
    marginTop: 4,
  },
  description: {
    color: '#324053',
    fontSize: 14,
    lineHeight: 21,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  favorite: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '800',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  openBadge: {
    backgroundColor: palette.success,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  closedBadge: {
    backgroundColor: palette.danger,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  openText: {
    color: palette.successText,
    fontSize: 11,
    fontWeight: '800',
  },
  closedText: {
    color: palette.dangerText,
    fontSize: 11,
    fontWeight: '800',
  },
});
