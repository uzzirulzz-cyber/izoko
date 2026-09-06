import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Button, Card } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { AuthFlow } from './AuthScreens';
import Constants from 'expo-constants';
import { API_BASE } from '../config';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const version = Constants.expoConfig?.version || '1.0.0';

  if (!user) {
    // Guests get the full sign-in / registration flow right inside the tab
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AuthFlow embedded />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={{ paddingHorizontal: 2, paddingTop: 6, paddingBottom: 2 }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>Profile</Text>
      </View>

      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
        <View style={styles.avatar}>
          <Text style={{ color: colors.black, fontSize: 26, fontWeight: '900' }}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '900' }}>{user.name}</Text>
        <Text style={{ color: colors.textDim, fontSize: 12 }}>{user.email}</Text>
        <Text style={{ color: colors.textFaint, fontSize: 10 }}>
          Same account as playbeat.digital — orders &amp; cart stay in sync
        </Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={styles.sectionLabel}>Quick links</Text>
        <Row label="🌐 Open the web storefront" onPress={() => Linking.openURL(API_BASE)} />
        <Row label="📄 Refund Policy" onPress={() => Linking.openURL(`${API_BASE}/refund-policy`)} />
        <Row label="🛡️ Warranty & Replacement" onPress={() => Linking.openURL(`${API_BASE}/warranty`)} />
        <Row label="🔒 Privacy Policy" onPress={() => Linking.openURL(`${API_BASE}/privacy`)} />
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.sectionLabel}>About this app</Text>
        <Text style={{ color: colors.textDim, fontSize: 11.5, lineHeight: 17 }}>
          PlayBeat Digital — premium digital marketplace and official Magcubic 4K smart projector
          partner. Instant license-key delivery, courier dispatch for hardware, 24/7 support.
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: 10 }}>
          Version {version} · API {API_BASE.replace('https://', '')}
        </Text>
      </Card>

      <Button label="Sign out" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
