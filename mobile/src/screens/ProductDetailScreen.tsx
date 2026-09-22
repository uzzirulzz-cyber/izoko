import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, formatPrice, radius } from '../theme';
import { Button, Card } from '../components/ui';
import { imageUrl, type Product } from '../api/store';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const { product } = route.params;
  const { add } = useCart();
  const { user } = useAuth();
  const [variantId, setVariantId] = useState<string | undefined>(
    product.variants && product.variants.length ? product.variants[0].id : undefined
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const uri = useMemo(() => imageUrl(product), [product]);
  const variant = product.variants?.find((v) => v.id === variantId);
  const unitPrice = variant ? variant.price : product.price;
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > unitPrice);

  const addToCart = () => {
    add(product, variantId, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const buyNow = () => {
    add(product, variantId, qty);
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    navigation.navigate('Checkout');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 14, gap: 12 }}>
      <View style={styles.imageWrap}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Text style={{ fontSize: 56 }}>📦</Text>}
        {product.digital ? (
          <View style={styles.deliveryChip}>
            <Text style={{ color: colors.green, fontSize: 10, fontWeight: '900' }}>⚡ INSTANT DELIVERY</Text>
          </View>
        ) : (
          <View style={[styles.deliveryChip, { backgroundColor: 'rgba(125,211,252,0.12)' }]}>
            <Text style={{ color: colors.sky, fontSize: 10, fontWeight: '900' }}>🚚 COURIER DISPATCH</Text>
          </View>
        )}
      </View>

      <Card style={{ gap: 8 }}>
        <Text style={{ color: colors.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {product.category || 'Digital product'}
        </Text>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: '900', lineHeight: 24 }}>{product.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.amber, fontSize: 22, fontWeight: '900' }}>{formatPrice(unitPrice)}</Text>
          {hasDiscount ? (
            <Text style={{ color: colors.textFaint, fontSize: 13, textDecorationLine: 'line-through' }}>
              {formatPrice(product.originalPrice!)}
            </Text>
          ) : null}
        </View>
        {product.description ? (
          <Text style={{ color: colors.textDim, fontSize: 12.5, lineHeight: 20 }}>{product.description}</Text>
        ) : null}
      </Card>

      {product.variants && product.variants.length > 0 ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.pickLabel}>Choose plan</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((v) => {
              const active = v.id === variantId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVariantId(v.id)}
                  style={[styles.variant, active && styles.variantActive]}
                >
                  <Text style={[styles.variantText, active && styles.variantTextActive]} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <Text style={[styles.variantPrice, active && styles.variantTextActive]}>{formatPrice(v.price)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.pickLabel}>Quantity</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: '800', minWidth: 26, textAlign: 'center' }}>{qty}</Text>
            <Pressable onPress={() => setQty((q) => Math.min(99, q + 1))} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label={added ? '✓ Added to cart' : 'Add to cart'} onPress={addToCart} variant="dark" />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Buy now" onPress={buyNow} />
          </View>
        </View>
      </Card>

      <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 }}>
        🔒 Secure checkout · server-verified prices · license keys released only after payment verification
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deliveryChip: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: 'rgba(52,211,153,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickLabel: { color: colors.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  variant: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    maxWidth: '48%',
  },
  variantActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  variantText: { color: colors.text, fontSize: 11.5, fontWeight: '700' },
  variantTextActive: { color: colors.black },
  variantPrice: { color: colors.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: colors.white, fontSize: 18, fontWeight: '800' },
});
