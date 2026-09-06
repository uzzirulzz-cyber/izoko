import { api } from './client';
import { API_BASE } from '../config';

// ---------------------------------------------------------------- products
export interface Product {
  id?: string;
  _id?: string;
  sku?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  originalPrice?: number | null;
  images?: string[];
  image?: string;
  digital?: boolean;
  deliveryType?: string;
  stock?: number;
  rating?: number;
  variants?: { id: string; name: string; price: number }[];
  projectorSpec?: Record<string, string>;
  tags?: string[];
}

export interface Category {
  name: string;
  productCount?: number;
}

function imageUrl(p: Product): string | null {
  const raw = p.images?.[0] || p.image;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `${API_BASE}${raw}`;
}

export { imageUrl };

export async function fetchProducts(opts: { category?: string; search?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.category && opts.category !== 'all') params.set('category', opts.category);
  if (opts.search) params.set('search', opts.search);
  params.set('limit', String(opts.limit ?? 40));
  const data = await api.get<{ success: boolean; products: Product[]; total: number }>(
    `/api/products?${params.toString()}`
  );
  return data.products || [];
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const data = await api.get<{ success: boolean; categories: any[] }>('/api/categories');
    return (data.categories || []).map((c) =>
      typeof c === 'string' ? { name: c } : { name: c.name || String(c), productCount: c.count ?? c.productCount }
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- payments
export interface PaymentMethod {
  id: string;
  label: string;
  description?: string;
  available: boolean;
  unavailableReason?: string;
  recommended?: boolean;
  direct?: boolean;
  instructions?: string;
  brands?: { label: string; logo?: string }[];
}

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await api.get<{ success: boolean; methods: PaymentMethod[] }>('/api/payments/methods');
  return data.methods || [];
}

export async function applyCoupon(code: string, subtotal: number) {
  return api.post<{ success: boolean; coupon: { code: string; discount: number; discountType: string } }>(
    '/api/payments/coupon',
    { code: code.trim().toUpperCase(), subtotal },
    true
  );
}

// ---------------------------------------------------------------- orders
export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  variant?: string | null;
  licenseKey?: string | null;
}

export interface Order {
  orderNumber: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  totalAmount: number;
  subtotal?: number;
  discount?: number;
  currency?: string;
  paymentMethod?: string;
  createdAt: string;
  items: OrderItem[];
  customerName?: string;
  customerEmail?: string;
}

export async function fetchMyOrders(): Promise<Order[]> {
  const data = await api.get<{ success: boolean; orders: Order[] }>('/api/orders/me', true);
  return data.orders || [];
}

export async function fetchOrder(orderNumber: string): Promise<Order> {
  const data = await api.get<{ success: boolean; order: Order }>(
    `/api/orders/mine/${encodeURIComponent(orderNumber)}`,
    true
  );
  return data.order;
}

export interface CreateOrderPayload {
  items: {
    product: {
      id?: string;
      _id?: string;
      sku?: string;
      name: string;
      price: number;
      digital?: boolean;
      deliveryType?: string;
    };
    selectedVariant?: { id: string; name: string } | undefined;
    quantity: number;
    unitPrice: number;
  }[];
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  couponCode?: string;
  clientRequestId: string;
}

/** Creates the order — the server ALWAYS recomputes totals (client total ignored). */
export async function createOrder(payload: CreateOrderPayload) {
  const data = await api.post<{ success: boolean; order: Order; orderNumber: string }>(
    '/api/orders',
    payload,
    true
  );
  return data.order;
}

/** Rapid Gateway hosted checkout — returns the payment URL, or fails closed. */
export async function createRapidPayment(orderNumber: string) {
  const data = await api.post<{ success: boolean; paymentUrl?: string; orderId?: string }>(
    '/api/payments/rapid/create',
    { orderNumber },
    true
  );
  if (!data.paymentUrl) throw new Error('Payment gateway did not return a payment URL');
  return data.paymentUrl;
}

// ---------------------------------------------------------------- messages / support
export interface ChatMessage {
  id: string;
  senderType: 'customer' | 'staff' | 'bot';
  body: string;
  createdAt: string;
}

export async function startSupport(name: string, email: string, message: string) {
  const data = await api.post<{ success: boolean; conversation: { _id: string } }>('/api/messages/start', {
    name,
    email,
    message,
  });
  return data.conversation._id as string;
}

export async function fetchSupportMessages(conversationId: string): Promise<ChatMessage[]> {
  const data = await api.get<{ success: boolean; messages: any[] }>(
    `/api/messages/mine?conversationId=${encodeURIComponent(conversationId)}`
  );
  return (data.messages || []).map((m) => ({
    id: String(m._id || m.id),
    senderType: m.senderType,
    body: m.body,
    createdAt: m.createdAt,
  }));
}

export async function sendSupportMessage(conversationId: string, body: string) {
  await api.post('/api/messages/mine', { conversationId, body });
}

// ---------------------------------------------------------------- push tokens
export async function registerPushToken(token: string, platform: 'android' | 'ios', deviceName?: string) {
  await api.post(
    '/api/app/push-token',
    { token, platform, appVersion: '1.0.0', deviceName },
    true
  );
}
