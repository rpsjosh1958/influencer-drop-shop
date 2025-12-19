import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Doc: https://docs.expo.dev/versions/latest/sdk/notifications/

export async function registerForPushNotificationsAsync() {
  let token;

  // 1. Check Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  // 2. Get Token (Ex. ExpoPushToken)
  // token = (await Notifications.getExpoPushTokenAsync()).data;
  // console.log(token);

  // 3. Android Channels
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
