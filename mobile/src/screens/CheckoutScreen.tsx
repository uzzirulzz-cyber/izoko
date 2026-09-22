import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, formatPrice, radius } from '../theme';
import { Button, Card, Input } from '../components/ui';
import { Header } from './CartScreen';
import { applyCoupon, createOrder, createRapidPayment, fetchPaymentMethods, type PaymentMethod } from '../api/store';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

/**
 * Two-stage mobile checkout, mirroring the website:
 *   1. POST /api/orders      — server recomputes totals + re-validates the coupon
 *   2. Rapid orders          — POST /api/payments/rapid/create → hosted payment URL
 * Direct-method orders (easypaisa/jazzcash manual) complete with keys after
 * admin verification; Rapid orders go straight to the hosted payment page.
 */
export function CheckoutScreen({ navigation }: Props) {
  const { lines, subtotal, clear } = useCart();
  const { user, refresh } = useAuth();
  const rootNav = useNavigation<any>();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const clientRequestId = useRef(`app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    // Auth gate — mirrors the website (no guest checkout)
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to complete your order — same account as the website.', [
        { text: 'Sign in', onPress: () => rootNav.navigate('Auth') },
        { text: 'Cancel', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    fetchPaymentMethods()
      .then((m) => {
        setMethods(m);
        const recommended = m.find((x) => x.available && x.recommended) || m.find((x) => x.available);
        if (recommended) setSelected(recommended.id);
      })
      .catch(() => setError('Could not load payment methods — check your connection.'))
      .finally(() => setMethodsLoading(false));
  }, [user, navigation, rootNav]);

  const discount = useMemo(() => (coupon ? Math.min(coupon.discount, subtotal) : 0), [coupon, subtotal]);
  const total = Math.max(0, subtotal - discount);

  const tryCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    try {
      const res = await applyCoupon(couponCode, subtotal);
      setCoupon({ code: res.coupon.code, discount: res.coupon.discount });
    } catch (e: any) {
      setCoupon(null);
      setCouponError(e.message || 'Coupon invalid');
    }
  };

  const submit = async () => {
    setError('');
    if (!selected) {
      setError('Choose a payment method to continue.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required for order delivery.');
      return;
    }
    setSubmitting(true);
    try {
      const method = methods.find((m) => m.id === selected);
      const order = await createOrder({
        items: lines.map((l) => ({
          product: {
            id: l.product.id,
            _id: l.product._id,
            sku: l.product.sku,
            name: l.product.name,
            price: l.unitPrice,
            digital: l.product.digital,
            deliveryType: l.product.deliveryType,
          },
          selectedVariant: l.variantId ? { id: l.variantId, name: l.variantName || l.variantId } : undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        customerName: name.trim(),
        customerEmail: email.trim(),
        totalAmount: total, // reference only — server recomputes
        currency: 'PKR',
        paymentMethod: method?.direct ? method.label : 'rapid',
        couponCode: coupon?.code,
        clientRequestId: clientRequestId.current,
      });

      if (method && !method.direct) {
        // Rapid Gateway — get hosted payment URL and open it
        try {
          const paymentUrl = await createRapidPayment(order.orderNumber);
          await WebBrowser.openBrowserAsync(paymentUrl);
          Alert.alert(
            'Payment window opened',
            `Order ${order.orderNumber} is PENDING until payment is verified. Your keys unlock automatically after confirmation.`,
            [
              {
                text: 'View my order',
                onPress: () => {
                  clear();
                  refresh();
                  navigation.replace('OrderDetail', { orderNumber: order.orderNumber });
                },
              },
              { text: 'Close' },
            ]
          );
        } catch (e: any) {
          // fail-closed — order stays PENDING, cart preserved
          setError(e.message || 'Payment could not be started — your order is saved as PENDING.');
          return;
        }
      } else {
        Alert.alert(
          'Order placed',
          `Order ${order.orderNumber} received. You will get your license keys after payment verification.`,
          [
            {
              text: 'View my order',
              onPress: () => {
                clear();
                refresh();
                navigation.replace('OrderDetail', { orderNumber: order.orderNumber });
              },
            },
            { text: 'Close' },
          ]
        );
      }
    } catch (e: any) {
      setError(e.message || 'Could not place the order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Checkout" />
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
        {/* Stage 1 — contact */}
        <Card style={{ gap: 12 }}>
          <Text style={styles.stage}>1 · Customer details</Text>
          <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
          <Input label="Delivery email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        </Card>

        {/* Stage 2 — payment method */}
        <Card style={{ gap: 10 }}>
          <Text style={styles.stage}>2 · Payment method</Text>
          {methodsLoading ? (
            <Text style={{ color: colors.textFaint, fontSize: 12 }}>Loading methods…</Text>
          ) : methods.length === 0 ? (
            <Text style={{ color: colors.red, fontSize: 12 }}>
              Payment methods unavailable right now — please try again shortly.
            </Text>
          ) : (
            methods.map((m) => {
              const active = selected === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => (m.available ? setSelected(m.id) : null)}
                  style={[styles.method, active && styles.methodActive, !m.available && { opacity: 0.5 }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.white, fontSize: 13, fontWeight: '800' }}>{m.label}</Text>
                      {m.recommended && m.available ? (
                        <View style={styles.recChip}>
                          <Text style={{ color: colors.black, fontSize: 8.5, fontWeight: '900' }}>RECOMMENDED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.textDim, fontSize: 11, lineHeight: 15 }}>
                      {m.available ? m.description || '' : m.unavailableReason || 'Currently unavailable'}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]} />
                </Pressable>
              );
            })
          )}
        </Card>

        {/* Coupon */}
        <Card style={{ gap: 8 }}>
          <Text style={styles.stage}>Coupon</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Input value={couponCode} onChangeText={setCouponCode} placeholder="e.g. PLAYBEAT10" autoCapitalize="characters" />
            </View>
            <View style={{ width: 96 }}>
              <Button label="Apply" onPress={tryCoupon} variant="dark" />
            </View>
          </View>
          {coupon ? (
            <Text style={{ color: colors.green, fontSize: 11.5, fontWeight: '700' }}>
              ✓ {coupon.code} applied — you save {formatPrice(discount)}
            </Text>
          ) : null}
          {couponError ? <Text style={{ color: colors.red, fontSize: 11.5 }}>{couponError}</Text> : null}
        </Card>

        {/* Summary */}
        <Card style={{ gap: 7 }}>
          <Text style={styles.stage}>Summary</Text>
          <Row label="Subtotal" value={formatPrice(subtotal)} />
          {discount > 0 ? <Row label={`Discount (${coupon?.code})`} value={`− ${formatPrice(discount)}`} green /> : null}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
          <Row label="Total" value={formatPrice(total)} big />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Legal gates */}
        <Pressable onPress={() => setAgreed((a) => !a)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed ? <Text style={{ color: colors.black, fontSize: 12, fontWeight: '900', lineHeight: 15 }}>✓</Text> : null}
          </View>
          <Text style={{ color: colors.textDim, fontSize: 11, lineHeight: 16, flex: 1 }}>
            I agree to the Terms of Service, Refund Policy and Privacy Policy, and I understand digital
            keys are released after payment verification.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={submitting ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
          onPress={submit}
          loading={submitting}
          disabled={!agreed || !selected || lines.length === 0}
        />
      </View>
    </View>
  );
}

function Row({ label, value, big, green }: { label: string; value: string; big?: boolean; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textDim, fontSize: big ? 14 : 12 }}>{label}</Text>
      <Text style={{ color: green ? colors.green : big ? colors.amber : colors.white, fontSize: big ? 17 : 12, fontWeight: '900' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { color: colors.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  methodActive: { borderColor: colors.amber, backgroundColor: 'rgba(255,193,7,0.06)' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioActive: { borderColor: colors.amber, backgroundColor: colors.amber },
  recChip: {
    backgroundColor: colors.amber,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  error: {
    color: colors.red,
    fontSize: 12,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: 10,
  },
  footer: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
