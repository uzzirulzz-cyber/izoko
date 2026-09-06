import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, formatPrice, radius } from '../theme';
import { imageUrl, type Product } from '../api/store';

// ------------------------------------------------------------------ Button
export function Button({
  label,
  onPress,
  variant = 'gold',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'gold' | 'dark' | 'danger' | 'social';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'gold'
      ? { backgroundColor: colors.amber }
      : variant === 'danger'
        ? { backgroundColor: 'rgba(248,113,113,0.14)', borderColor: 'rgba(248,113,113,0.4)' }
        : variant === 'social'
          ? { backgroundColor: colors.white }
          : { backgroundColor: 'rgba(148,163,184,0.10)' };
  const fg = variant === 'gold' || variant === 'danger' ? colors.black : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        bg,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------ inputs
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ card
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.amber} size="large" />
    </View>
  );
}

// ------------------------------------------------------------------ product card
export function ProductCardItem({ product, onPress }: { product: Product; onPress: () => void }) {
  const uri = imageUrl(product);
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.prodCard, pressed && { opacity: 0.85 }]}>
      <View style={styles.prodImageWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.prodImage} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 30 }}>📦</Text>
        )}
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text numberOfLines={2} style={styles.prodName}>
          {product.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.prodPrice}>{formatPrice(product.price)}</Text>
          {hasDiscount ? <Text style={styles.prodOldPrice}>{formatPrice(product.originalPrice!)}</Text> : null}
        </View>
        {product.digital ? (
          <Text style={styles.instantChip}>⚡ INSTANT DELIVERY</Text>
        ) : (
          <Text style={styles.courierChip}>🚚 COURIER DISPATCH</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.25)',
    paddingHorizontal: 16,
  },
  buttonLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  inputLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  inputWrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
  },
  input: { color: colors.white, fontSize: 14, height: 46 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { color: colors.white, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptyBody: { color: colors.textDim, fontSize: 12, textAlign: 'center', lineHeight: 19 },
  prodCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  prodImageWrap: {
    height: 110,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodImage: { width: '100%', height: '100%' },
  prodName: { color: colors.white, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  prodPrice: { color: colors.amber, fontSize: 13, fontWeight: '800' },
  prodOldPrice: {
    color: colors.textFaint,
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  instantChip: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  courierChip: { color: colors.sky, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
});
