import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppRole } from '../../lib/auth';

export function RoleSelectionScreen({
  onSelectRole,
}: {
  onSelectRole: (role: AppRole) => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Coco Finder</Text>
          <Text style={styles.subtitle}>Choose your experience</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleBlue}>Vendor</Text>
          <Text style={styles.sectionCopy}>
            Go live and connect with nearby customers
          </Text>
          <Pressable
            style={[styles.roleButton, styles.vendorButton]}
            onPress={() => onSelectRole('vendor')}
          >
            <Text style={styles.roleEmoji}>🛺</Text>
            <View style={styles.roleCopyWrap}>
              <Text style={styles.roleTitleLight}>Continue as Vendor</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.divider}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitleOrange}>Customer</Text>
          <Text style={styles.sectionCopy}>
            Discover, chat and find vendors around you
          </Text>
          <Pressable
            style={[styles.roleButton, styles.customerButton]}
            onPress={() => onSelectRole('customer')}
          >
            <Text style={styles.roleEmoji}>👤</Text>
            <View style={styles.roleCopyWrap}>
              <Text style={styles.roleTitleLight}>Continue as Customer</Text>
            </View>
          </Pressable>
        </View>

        <Pressable style={styles.adminLink} onPress={() => onSelectRole('admin')}>
          <Text style={styles.adminLinkText}>Admin access</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    justifyContent: 'flex-start',
  },
  hero: {
    gap: 14,
  },
  title: {
    color: '#2D9BF0',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    maxWidth: 280,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 310,
  },
  section: {
    marginTop: 44,
    gap: 16,
  },
  sectionTitleBlue: {
    color: '#2D9BF0',
    fontSize: 32,
    fontWeight: '800',
  },
  sectionTitleOrange: {
    color: '#FF9C42',
    fontSize: 32,
    fontWeight: '800',
  },
  sectionCopy: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  roleButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 26,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  vendorButton: {
    backgroundColor: '#2D9BF0',
  },
  customerButton: {
    backgroundColor: '#FF9C42',
  },
  roleEmoji: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  roleCopyWrap: {
    flexShrink: 1,
  },
  roleTitleLight: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  dividerRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  divider: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '700',
  },
  adminLink: {
    marginTop: 26,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  adminLinkText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
