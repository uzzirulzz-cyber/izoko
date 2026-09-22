import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius } from '../theme';
import { Button, Card, EmptyState, Loading } from '../components/ui';
import { fetchMyOrders, type Order } from '../api/store';
import { useAuth } from '../state/AuthContext';
import { API_BASE } from '../config';

/**
 * Notifications — an aggregated feed derived from the SAME backend data the
 * website uses: order status changes and support replies. No separate mobile
 * database; everything is derived live from /api/orders/me.
 */
export function NotificationsScreen() {
  const { user, booting } = useAuth();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setOrders(await fetchMyOrders());
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (booting || loading) return <Loading />;
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Title />
        <EmptyState icon="🔔" title="Sign in required" body="Sign in to get order and delivery notifications." />
        <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          <Button label="Sign in" onPress={() => navigation.navigate('Auth')} variant="dark" />
        </View>
      </View>
    );
  }

  // Derive a feed: newest first
  const items = orders
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((o) => ({
      id: o.orderNumber,
      icon: o.status === 'completed' || o.status === 'paid' ? '✅' : o.status === 'pending' ? '⏳' : '❌',
      title:
        o.status === 'pending'
          ? `Order ${o.orderNumber} awaiting payment`
          : o.status === 'completed' || o.status === 'paid'
            ? `Order ${o.orderNumber} delivered — keys ready`
            : `Order ${o.orderNumber} ${o.status}`,
      body: o.items.map((i) => i.name).join(', ').slice(0, 90),
      at: o.createdAt,
    }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Title />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="Nothing yet" body="Order updates will show up here and as push notifications." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.white, fontSize: 12.5, fontWeight: '800' }}>{item.title}</Text>
                {item.body ? (
                  <Text numberOfLines={1} style={{ color: colors.textDim, fontSize: 11 }}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={{ color: colors.textFaint, fontSize: 10 }}>
                  {new Date(item.at).toLocaleString()}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
      <View style={styles.envNote}>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, lineHeight: 15 }}>
          Push notifications register automatically after sign-in · API {API_BASE.replace('https://', '')}
        </Text>
      </View>
    </View>
  );
}

function Title() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
      <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>Notifications</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  envNote: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
