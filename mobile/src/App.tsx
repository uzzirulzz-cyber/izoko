import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { RootNavigation } from './navigation';
import { AuthProvider, useAuth } from './state/AuthContext';
import { CartProvider } from './state/CartContext';
import { registerPushToken } from './api/store';
import { APP_VERSION } from './config';

// Foreground notification presentation (heads-up banner while the app is open)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registers the Expo push token against the SAME backend (no separate DB). */
function PushRegistrar() {
  const { user } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || registeredFor.current === user.email) return;
    (async () => {
      try {
        if (!Device.isDevice) return; // push requires a physical device
        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') return;
        const token = await Notifications.getExpoPushTokenAsync();
        if (token?.data) {
          await registerPushToken(token.data, Platform.OS === 'ios' ? 'ios' : 'android', Device.modelName || undefined);
          registeredFor.current = user.email;
        }
      } catch {
        /* push is best-effort — never blocks the app */
      }
    })();
  }, [user]);

  return null;
}

function AppBody() {
  return (
    <>
      <PushRegistrar />
      <RootNavigation />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppBody />
      </CartProvider>
    </AuthProvider>
  );
}
