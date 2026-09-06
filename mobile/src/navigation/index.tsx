import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useAuth } from '../state/AuthContext';
import { AuthFlow } from '../screens/AuthScreens';
import { HomeScreen } from '../screens/HomeScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderDetailScreen, OrdersScreen } from '../screens/OrdersScreens';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SupportScreen } from '../screens/SupportScreen';

import type { Product } from '../api/store';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  ProductDetail: { product: Product };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetail: { orderNumber: string };
  Notifications: undefined;
  Profile: undefined;
  Support: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  Cart: undefined;
  Orders: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surfaceAlt,
    text: colors.text,
    primary: colors.amber,
    border: colors.border,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surfaceAlt,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Guests CAN browse the catalog (like the website); sign-in / registration is
 * a full-screen modal flow that mirrors the storefront AuthModal. Cart and
 * checkout stay auth-gated exactly like the web.
 */
function RootNavigator() {
  const { booting } = useAuth();
  if (booting) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Auth"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      >
        {() => <AuthFlow />}
      </Stack.Screen>
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigation() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
