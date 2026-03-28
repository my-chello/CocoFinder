import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionCard } from '../../components/SectionCard';
import { palette } from '../../config/theme';
import { vendors } from '../../data/mockVendors';
import { getVendorProfile, type VendorProfileSetup } from '../../lib/vendorProfile';

const vendorChecklist = [
  'Register vendor account and verify business',
  'Toggle Go Live to start location sharing',
  'Update menu items and pricing',
  'Set hours and open-now state',
  'Review views, saves, and taps later in analytics',
];

export function VendorHubScreen() {
  const liveVendor = vendors.find((vendor) => vendor.liveStatus === 'live');
  const [vendorProfile, setVendorProfile] = useState<VendorProfileSetup | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVendorProfile() {
      const profile = await getVendorProfile();

      if (isMounted) {
        setVendorProfile(profile);
      }
    }

    void loadVendorProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileName = vendorProfile?.businessName ?? liveVendor?.name ?? 'Vendor preview';
  const profileHours = vendorProfile?.openingHours ?? 'Hours not set yet';
  const profileCategory = vendorProfile?.category ?? 'Category not set yet';
  const profileAbout = vendorProfile?.about ?? 'Complete your setup to describe your business.';
  const profileProductName = vendorProfile?.firstProductName ?? 'No product added yet';
  const profileProductPrice = vendorProfile?.firstProductPrice ?? 'Add a price';
  const profileSymbol = vendorProfile?.logoSymbol ?? '🛺';

  return (
    <ScreenContainer>
      <SectionCard eyebrow="Vendor App" title={profileName}>
        <View style={styles.heroRow}>
          <View style={styles.livePanel}>
            <Text style={styles.profileSymbol}>{profileSymbol}</Text>
            <Text style={styles.liveLabel}>Go Live</Text>
            <Text style={styles.liveHeadline}>Share current position with nearby customers</Text>
            <Text style={styles.liveCopy}>
              {profileAbout}
            </Text>
          </View>
          <View style={styles.toggleMock}>
            <Text style={styles.toggleText}>LIVE</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard eyebrow="Checklist" title="MVP vendor actions" tone="light">
        {vendorChecklist.map((item) => (
          <View key={item} style={styles.checkRow}>
            <Text style={styles.checkDot}>•</Text>
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard eyebrow="Business Profile" title={profileCategory}>
        <Text style={styles.previewText}>
          Hours: {profileHours}{'\n'}
          Phone: {vendorProfile?.phone ?? 'Add phone number'}{'\n'}
          First product: {profileProductName} · {profileProductPrice}
        </Text>
      </SectionCard>

      <SectionCard eyebrow="Live Preview" title={liveVendor?.name ?? 'Vendor preview'}>
        <Text style={styles.previewText}>
          Status: {liveVendor?.isOpen ? 'Open now' : 'Closed'}{'\n'}
          Next area: {liveVendor?.nextArea}{'\n'}
          Last update: {liveVendor?.lastUpdated}
        </Text>
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  livePanel: {
    flex: 1,
    backgroundColor: '#20324B',
    borderRadius: 20,
    padding: 16,
  },
  profileSymbol: {
    fontSize: 28,
  },
  liveLabel: {
    color: palette.mint,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  liveHeadline: {
    color: palette.cloud,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  liveCopy: {
    color: '#B7C4D8',
    lineHeight: 21,
    marginTop: 10,
  },
  toggleMock: {
    width: 92,
    borderRadius: 20,
    backgroundColor: '#1F9D73',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    color: '#F5FFFA',
    fontSize: 18,
    fontWeight: '900',
  },
  checkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkDot: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  checkText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
  previewText: {
    color: '#D6E2F0',
    fontSize: 14,
    lineHeight: 23,
  },
});
