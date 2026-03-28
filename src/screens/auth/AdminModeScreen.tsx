import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AdminModeScreen({
  onViewAsCustomer,
  onViewAsVendor,
  onSignOut,
}: {
  onViewAsCustomer: () => void;
  onViewAsVendor: () => void;
  onSignOut: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🛺</Text>
          <Text style={styles.brandText}>COCO FINDER</Text>
        </View>
        <Text style={styles.modeBadge}>Admin Mode</Text>
      </View>

      <View style={styles.illustrationWrap}>
        <View style={styles.panelBack} />
        <View style={styles.panelFront}>
          <Text style={styles.panelTitle}>Admin</Text>
          <Text style={styles.panelCopy}>
            Review flows, preview vendor and customer experiences, and switch safely without
            changing the real account role.
          </Text>

          <View style={styles.optionsWrap}>
            <Pressable style={[styles.optionButton, styles.customerButton]} onPress={onViewAsCustomer}>
              <Text style={styles.optionEmoji}>👤</Text>
              <Text style={styles.optionText}>View as Customer</Text>
            </Pressable>

            <Pressable style={[styles.optionButton, styles.vendorButton]} onPress={onViewAsVendor}>
              <Text style={styles.optionEmoji}>🛺</Text>
              <Text style={styles.optionText}>View as Vendor</Text>
            </Pressable>

            <Pressable style={[styles.optionButton, styles.adminButton]} onPress={onSignOut}>
              <Text style={styles.adminButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6ECDF',
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
    paddingTop: 40,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  panelBack: {
    position: 'absolute',
    top: 94,
    left: 42,
    right: 42,
    bottom: 82,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  panelFront: {
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 12,
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
  optionsWrap: {
    marginTop: 30,
    gap: 16,
  },
  optionButton: {
    borderRadius: 999,
    minHeight: 72,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  customerButton: {
    backgroundColor: '#FF9C42',
  },
  vendorButton: {
    backgroundColor: '#2D9BF0',
  },
  adminButton: {
    backgroundColor: '#111827',
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
