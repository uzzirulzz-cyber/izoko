import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, formatPrice, radius } from '../theme';
import { Button, Card, EmptyState } from '../components/ui';
import { lineLabel, useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';

// Cart renders both as a tab screen and (deep-linked) from the stack —
// navigation bubbles to the root stack, so typing stays loose.
type Props = { navigation: any };

export function CartScreen({ navigation }: Props) {
  const { lines, subtotal, setQty, remove, clear } = useCart();
  const { user } = useAuth();

  if (lines.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Cart" />
        <EmptyState icon="🛒" title="Your cart is empty" body="Browse the catalog and add something you love." />
        <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          <Button label="Browse products" onPress={() => navigation.navigate('HomeTab')} variant="dark" />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title={`Cart (${lines.reduce((n, l) => n + l.quantity, 0)})`} />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {lines.map((l, i) => (
          <Card key={`${l.product._id || l.product.id}-${l.variantId || i}`} style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '800', lineHeight: 18 }} numberOfLines={2}>
                  {lineLabel(l)}
                </Text>
                <Text style={{ color: colors.amber, fontSize: 12, fontWeight: '800' }}>{formatPrice(l.unitPrice)}</Text>
                {l.product.digital ? (
                  <Text style={{ color: colors.green, fontSize: 9.5, fontWeight: '800' }}>⚡ INSTANT DELIVERY</Text>
                ) : (
                  <Text style={{ color: colors.sky, fontSize: 9.5, fontWeight: '800' }}>🚚 COURIER DISPATCH</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '900' }}>{formatPrice(l.unitPrice * l.quantity)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable onPress={() => setQty(i, l.quantity - 1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={{ color: colors.white, fontWeight: '800', minWidth: 22, textAlign: 'center' }}>{l.quantity}</Text>
                  <Pressable onPress={() => setQty(i, l.quantity + 1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => remove(i)} hitSlop={6}>
                  <Text style={{ color: colors.red, fontSize: 10.5, fontWeight: '700' }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ))}
        <Pressable onPress={clear} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
          <Text style={{ color: colors.textFaint, fontSize: 11 }}>Clear cart</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: colors.textDim, fontSize: 13 }}>Subtotal</Text>
          <Text style={{ color: colors.white, fontSize: 15, fontWeight: '900' }}>{formatPrice(subtotal)}</Text>
        </View>
        <Button
          label={user ? 'Proceed to checkout' : 'Sign in to checkout'}
          onPress={() => (user ? navigation.navigate('Checkout') : navigation.navigate('Auth'))}
        />
        <Text style={{ color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 8 }}>
          Server-verified totals at checkout · coupons applied there
        </Text>
      </View>
    </View>
  );
}

export function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  footer: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
