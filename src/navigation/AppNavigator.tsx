import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import { palette } from '../config/theme';
import { FavoritesScreen } from '../screens/customer/FavoritesScreen';
import { MapScreen } from '../screens/customer/MapScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';
import { MessagesNavigator } from './MessagesNavigator';
import { VendorsNavigator } from './VendorsNavigator';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.ink,
    card: palette.panel,
    text: palette.cloud,
    primary: palette.mint,
    border: palette.panelAlt,
  },
};

const iconMap = {
  Map: {
    active: 'map',
    inactive: 'map-outline',
  },
  Vendors: {
    active: 'storefront',
    inactive: 'storefront-outline',
  },
  Messages: {
    active: 'chatbubble-ellipses',
    inactive: 'chatbubble-ellipses-outline',
  },
  Favorites: {
    active: 'heart',
    inactive: 'heart-outline',
  },
  Profile: {
    active: 'person',
    inactive: 'person-outline',
  },
} as const;

const tabBarColors = {
  shell: 'rgba(6, 56, 66, 0.22)',
  shellOverlay: 'rgba(170, 228, 236, 0.06)',
  rim: 'rgba(236, 251, 255, 0.16)',
  topSheen: 'rgba(255, 255, 255, 0.18)',
  active: '#18A8FF',
  inactive: 'rgba(240, 247, 255, 0.88)',
  activeGlow: 'rgba(24, 168, 255, 0.08)',
};

function triggerTabHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Map"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            position: 'absolute',
            left: 18,
            right: 18,
            bottom: Platform.OS === 'ios' ? 28 : 20,
            height: Platform.OS === 'ios' ? 74 : 70,
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: tabBarColors.rim,
            borderRadius: Platform.OS === 'ios' ? 39 : 37,
            backgroundColor: tabBarColors.shell,
            paddingBottom: Platform.OS === 'ios' ? 7 : 5,
            paddingTop: 7,
            paddingHorizontal: 20,
            shadowColor: '#000000',
            shadowOffset: {
              width: 0,
              height: 18,
            },
            shadowOpacity: 0.2,
            shadowRadius: 22,
            elevation: 16,
            overflow: 'hidden',
          },
          tabBarBackground: () => (
            <BlurView
              intensity={Platform.OS === 'ios' ? 85 : 60}
              tint="dark"
              style={styles.tabShell}
            >
              <View style={styles.tabSheen} />
              <View style={styles.tabOverlay} />
            </BlurView>
          ),
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '700',
            marginTop: 0,
          },
          tabBarItemStyle: {
            borderRadius: 14,
            marginHorizontal: 2,
            paddingVertical: 0,
          },
          tabBarActiveTintColor: tabBarColors.active,
          tabBarInactiveTintColor: tabBarColors.inactive,
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={
                  focused
                    ? iconMap[route.name as keyof typeof iconMap].active
                    : iconMap[route.name as keyof typeof iconMap].inactive
                }
                size={23}
                color={color}
              />
            </View>
          ),
        })}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          listeners={{
            tabPress: triggerTabHaptic,
          }}
        />
        <Tab.Screen
          name="Vendors"
          component={VendorsNavigator}
          listeners={({ navigation }) => ({
            tabPress: () => {
              triggerTabHaptic();
              navigation.navigate('Vendors', {
                screen: 'VendorsList',
              });
            },
          })}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesNavigator}
          listeners={({ navigation }) => ({
            tabPress: () => {
              triggerTabHaptic();
              navigation.navigate('Messages', {
                screen: 'ConversationsList',
              });
            },
          })}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesScreen}
          listeners={{
            tabPress: triggerTabHaptic,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          listeners={{
            tabPress: triggerTabHaptic,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabShell: {
    flex: 1,
    borderRadius: 39,
    backgroundColor: tabBarColors.shell,
    overflow: 'hidden',
  },
  tabSheen: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 1,
    backgroundColor: tabBarColors.topSheen,
  },
  tabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tabBarColors.shellOverlay,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: tabBarColors.activeGlow,
    shadowColor: tabBarColors.active,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
});
