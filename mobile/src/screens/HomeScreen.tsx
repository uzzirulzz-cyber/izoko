import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius } from '../theme';
import { Button, Card, EmptyState, ProductCardItem } from '../components/ui';
import { fetchCategories, fetchProducts, type Product } from '../api/store';
import { useAuth } from '../state/AuthContext';

// Rendered inside the Shop tab — navigation bubbles to the root stack for
// ProductDetail etc., so the navigator typing stays loose here.
type Props = { navigation: any };

const CATEGORIES = ['all', 'Streaming', 'Subscriptions', 'Gift Cards', 'Gaming', 'Software', 'Smart Projectors'];

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      if (opts?.showSpinner) setLoading(true);
      try {
        const [prods, cats] = await Promise.all([
          fetchProducts({ category, search: search || undefined, limit: 60 }),
          opts?.showSpinner ? fetchCategories() : Promise.resolve([]),
        ]);
        setProducts(prods);
        if (cats.length) {
          const counts: Record<string, number> = {};
          for (const c of cats) counts[c.name] = c.productCount || 0;
          setCategoryCounts(counts);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, search]
  );

  useEffect(() => {
    const t = setTimeout(() => load({ showSpinner: !products.length }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PlayBeat Digital</Text>
          <Text style={styles.brandSub}>
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Instant delivery · 24/7'}
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.avatar}>
          <Text style={{ color: colors.amber, fontWeight: '900', fontSize: 14 }}>
            {(user?.name || '?').charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      {/* search */}
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search subscriptions, keys, projectors…"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      {/* category chips */}
      <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(c) => c}
          renderItem={({ item }) => {
            const active = category === item;
            return (
              <Pressable
                onPress={() => setCategory(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item === 'all' ? 'All' : item}
                  {item !== 'all' && categoryCounts[item] ? ` (${categoryCounts[item]})` : ''}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* products */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.amber} size="large" />
        </View>
      ) : products.length === 0 ? (
        <EmptyState icon="🔍" title="Nothing found" body="Try a different search or category." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p, i) => String(p._id || p.id || i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 14 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 24, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
          renderItem={({ item }) => (
            <ProductCardItem product={item} onPress={() => navigation.navigate('ProductDetail', { product: item })} />
          )}
        />
      )}
    </View>
  );
}

export function CategoryScreen() {
  // Kept minimal — category browsing is handled by the Home chips, and
  // /category/:slug deep links land here in a future iteration.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textDim }}>Browse categories from the Home tab.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
  },
  brand: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  brandSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { paddingHorizontal: 14, paddingBottom: 8 },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    color: colors.white,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.black },
});
