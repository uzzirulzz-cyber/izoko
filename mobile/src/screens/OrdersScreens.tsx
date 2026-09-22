import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors, formatPrice, radius } from '../theme';
import { Button, Card, EmptyState, Loading } from '../components/ui';
import { fetchMyOrders, fetchOrder, type Order } from '../api/store';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

const STATUS_COLORS: Record<string, string> = {
  pending: colors.amber,
  paid: colors.green,
  completed: colors.green,
  cancelled: colors.textFaint,
  failed: colors.red,
};

function statusChip(status: string) {
  const c = STATUS_COLORS[status] || colors.textDim;
  return (
    <View style={[styles.statusChip, { borderColor: c }]}>
      <Text style={{ color: c, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 }}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

export function OrdersScreen() {
  const { user, booting } = useAuth();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (booting || loading) return <Loading />;

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>Orders</Text>
        </View>
        <EmptyState icon="🔐" title="Sign in required" body="Sign in to see your order history and license keys." />
        <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          <Button label="Sign in" onPress={() => navigation.navigate('Auth')} variant="dark" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>My Orders</Text>
      </View>
      {orders.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet" body="Your purchases will appear here with live status." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.orderNumber}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.amber} />}
          renderItem={({ item }) => (
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '900' }}>{item.orderNumber}</Text>
                {statusChip(item.status)}
              </View>
              <Text style={{ color: colors.textDim, fontSize: 11 }}>
                {new Date(item.createdAt).toLocaleString()} · {item.paymentMethod || '—'}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12 }}>
                {item.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
              </Text>
              <Text style={{ color: colors.amber, fontSize: 14, fontWeight: '900' }}>
                {formatPrice(item.totalAmount)}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

export function OrderDetailScreen({ route }: Props) {
  const { orderNumber } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(orderNumber));
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load the order.');
    }
  }, [orderNumber]);

  useEffect(() => {
    load();
    // Pending Rapid orders poll — keys appear automatically after webhook verification
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <EmptyState icon="⚠️" title="Order unavailable" body={error} />
      </View>
    );
  }
  if (!order) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>{order.orderNumber}</Text>
      </View>
      <FlatList
        contentContainerStyle={{ padding: 14, gap: 12 }}
        ListHeaderComponent={
          <Card style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>Status</Text>
              {statusChip(order.status)}
            </View>
            {order.status === 'pending' ? (
              <Text style={{ color: colors.amber, fontSize: 11.5, lineHeight: 17 }}>
                ⏳ PENDING — this page refreshes automatically. License keys unlock the moment payment is
                verified; you will also get a push notification.
              </Text>
            ) : null}
            {order.discount ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textDim, fontSize: 12 }}>Discount</Text>
                <Text style={{ color: colors.green, fontSize: 12, fontWeight: '800' }}>− {formatPrice(order.discount)}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textDim, fontSize: 13 }}>Total</Text>
              <Text style={{ color: colors.amber, fontSize: 16, fontWeight: '900' }}>{formatPrice(order.totalAmount)}</Text>
            </View>
          </Card>
        }
        data={order.items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: '800', flex: 1, paddingRight: 8 }} numberOfLines={2}>
                {item.name}
                {item.variant ? ` — ${item.variant}` : ''}
              </Text>
              <Text style={{ color: colors.amber, fontSize: 13, fontWeight: '900' }}>
                {formatPrice(item.unitPrice * item.quantity)}
              </Text>
            </View>
            <Text style={{ color: colors.textFaint, fontSize: 11 }}>Qty {item.quantity}</Text>
            {item.licenseKey ? (
              <View style={styles.keyBox}>
                <Text style={{ color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 }}>
                  🔑 LICENSE KEY
                </Text>
                <Text style={{ color: colors.white, fontFamily: undefined, fontSize: 12.5 }}>{item.licenseKey}</Text>
              </View>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  keyBox: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderColor: 'rgba(52,211,153,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 2,
  },
});
