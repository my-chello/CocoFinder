import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { VendorsScreen } from '../screens/customer/VendorsScreen';
import { VendorDetailScreen } from '../screens/customer/VendorDetailScreen';
import { palette } from '../config/theme';

export type VendorsStackParamList = {
  VendorsList: undefined;
  VendorDetail: { vendorId: string };
};

const Stack = createNativeStackNavigator<VendorsStackParamList>();

export function VendorsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F7F4ED',
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '900',
        },
        contentStyle: {
          backgroundColor: palette.ink,
        },
      }}
    >
      <Stack.Screen
        name="VendorsList"
        component={VendorsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VendorDetail"
        component={VendorDetailScreen}
        options={({ navigation }) => ({
          title: 'Vendor Profile',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }

                navigation.navigate('VendorsList');
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingRight: 12,
                paddingLeft: 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: '#111827',
                  fontSize: 18,
                  fontWeight: '700',
                  lineHeight: 18,
                  marginRight: 4,
                }}
              >
                ‹
              </Text>
              <View>
                <Text
                  style={{
                    color: '#111827',
                    fontSize: 14,
                    fontWeight: '800',
                  }}
                >
                  Back
                </Text>
              </View>
            </Pressable>
          ),
        })}
      />
    </Stack.Navigator>
  );
}
