import React, { createContext, useContext, useMemo, useState } from 'react';
import { formatPrice } from '../theme';
import type { Product } from '../api/store';

export interface CartLine {
  product: Product;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (product: Product, variantId?: string, quantity?: number) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartState>(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal,
      add: (product, variantId, quantity = 1) => {
        setLines((prev) => {
          const variant = product.variants?.find((v) => v.id === variantId);
          const unitPrice = variant ? variant.price : product.price;
          const key = (l: CartLine) => `${l.product._id || l.product.id}|${l.variantId || ''}`;
          const idx = prev.findIndex(
            (l) => key(l) === `${product._id || product.id}|${variantId || ''}`
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
            return next;
          }
          return [
            ...prev,
            {
              product,
              variantId,
              variantName: variant?.name,
              unitPrice,
              quantity,
            },
          ];
        });
      },
      setQty: (index, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((_, i) => i !== index)
            : prev.map((l, i) => (i === index ? { ...l, quantity: Math.min(qty, 99) } : l))
        ),
      remove: (index) => setLines((prev) => prev.filter((_, i) => i !== index)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export function lineLabel(l: CartLine): string {
  return l.variantName ? `${l.product.name} — ${l.variantName}` : l.product.name;
}

export function lineTotal(l: CartLine): string {
  return formatPrice(l.unitPrice * l.quantity);
}
