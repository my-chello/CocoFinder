import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { MessageConversationScreen } from '../screens/customer/MessageConversationScreen';
import { MessagesScreen } from '../screens/customer/MessagesScreen';
import { palette } from '../config/theme';

export type MessagesStackParamList = {
  ConversationsList: undefined;
  ConversationDetail: { conversationId: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesNavigator() {
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
        name="ConversationsList"
        component={MessagesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ConversationDetail"
        component={MessageConversationScreen}
        options={({ navigation }) => ({
          title: 'Chat',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }

                navigation.navigate('ConversationsList');
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
