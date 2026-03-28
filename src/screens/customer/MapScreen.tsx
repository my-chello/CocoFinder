import { useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../config/theme';
import { useVendorData } from '../../hooks/useVendorData';

export function MapScreen() {
  const navigation = useNavigation<any>();
  const { vendorTabRecords } = useVendorData(null);
  const liveVendors = vendorTabRecords.filter((record) => record.vendor.liveStatus === 'live');
  const featuredVendors = liveVendors.slice(0, 6);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Web preview</Text>
          <Text style={styles.title}>Live map is available in the mobile app</Text>
          <Text style={styles.copy}>
            CocoFinder Web can show your live vendors, messages, favorites, and profiles. The
            interactive native map still needs a dedicated web implementation.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{liveVendors.length} live vendors</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>What works on web right now</Text>
          <Text style={styles.noticeItem}>Browse vendors and open vendor profiles</Text>
          <Text style={styles.noticeItem}>Use authentication and messaging flows</Text>
          <Text style={styles.noticeItem}>Keep using the native live map on iPhone and Android</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live vendors</Text>
          <Text style={styles.sectionSubtitle}>Open a vendor profile while the web map is pending</Text>
        </View>

        <View style={styles.cardList}>
          {featuredVendors.length > 0 ? (
            featuredVendors.map((record) => (
              <Pressable
                key={record.vendor.id}
                style={styles.vendorCard}
                onPress={() =>
                  navigation.navigate('Vendors', {
                    screen: 'VendorDetail',
                    params: { vendorId: record.vendor.id },
                  })
                }
              >
                <View style={styles.vendorMeta}>
                  <View style={styles.vendorSymbolWrap}>
                    <Text style={styles.vendorSymbol}>
                      {record.vendor.imageSymbol ?? record.vendor.imageHint}
                    </Text>
                  </View>
                  <View style={styles.vendorBody}>
                    <Text style={styles.vendorName}>{record.vendor.businessName}</Text>
                    <Text style={styles.vendorInfo}>
                      {record.vendor.category} · {record.vendor.distanceKm} km away
                    </Text>
                    <Text style={styles.vendorInfo}>{record.vendor.operatingHours}</Text>
                  </View>
                </View>
                <View style={styles.livePill}>
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No live vendors at the moment</Text>
              <Text style={styles.emptyCopy}>
                Once vendors go live, they will show here on web and on the full map in the mobile
                app.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#F8EEDF',
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  eyebrow: {
    color: '#C2410C',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  copy: {
    marginTop: 12,
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  badgeText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
  },
  noticeCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
    gap: 8,
  },
  noticeTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  noticeItem: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 14,
  },
  cardList: {
    gap: 12,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#082C33',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  vendorMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vendorSymbolWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorSymbol: {
    fontSize: 22,
  },
  vendorBody: {
    flex: 1,
    gap: 4,
  },
  vendorName: {
    color: palette.cloud,
    fontSize: 16,
    fontWeight: '800',
  },
  vendorInfo: {
    color: 'rgba(226, 232, 240, 0.82)',
    fontSize: 13,
  },
  livePill: {
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePillText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
});
