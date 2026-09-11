export type MenuType = 'sweet' | 'savoury';

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  menu_type?: MenuType;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export type CravingTag =
  | 'crispy'
  | 'spicy'
  | 'cheesy'
  | 'filling'
  | 'sweet'
  | 'quick-bite';

export const CRAVING_TAGS: { id: CravingTag; label: string; icon: string }[] = [
  { id: 'crispy', label: 'Crispy', icon: '🔥' },
  { id: 'spicy', label: 'Spicy', icon: '🌶' },
  { id: 'cheesy', label: 'Cheesy', icon: '🧀' },
  { id: 'filling', label: 'Filling', icon: '🍔' },
  { id: 'sweet', label: 'Sweet', icon: '🍫' },
  { id: 'quick-bite', label: 'Quick Bite', icon: '⚡' },
];

export interface PriceVariant {
  label: string;
  price: number;
}

export interface MenuItem {
  image_override?: boolean;
  image_urls?: string[];
  sku?: string;
  deleted_at?: string | null;
  stock_quantity?: number;
  preparation_minutes?: number;
  display_order?: number;
  available_from?: string;
  available_until?: string;
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  price_variants?: PriceVariant[];
  portion?: string;
  ingredients?: string[];
  allergens?: string[];
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
  is_featured?: boolean;
  is_spicy: boolean;
  tags: CravingTag[];
  addons?: Addon[];
}

export interface CartItem extends MenuItem {
  productId?: string;
  selectedVariant?: string;
  quantity: number;
  selectedAddons: Addon[];
}

export interface OrderItemSnapshot {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  addons: { name: string; price: number }[];
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  order_type: 'delivery' | 'pickup';
  status: OrderStatus;
  items: OrderItemSnapshot[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  delivery_address?: string;
  landmark?: string;
  special_instructions?: string;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method?: string;
  created_at: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  coupon?: string;
  image_url: string;
  is_active: boolean;
  expires_at?: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  date: string;
}

export interface RestaurantSettings {
  tax_percentage?: number;
  delivery_available?: boolean;
  pickup_available?: boolean;
  min_order_value?: number;
  preparation_minutes?: number;
  name: string;
  tagline: string;
  address: string;
  google_maps_url: string;
  instagram_url: string;
  reel_url: string;
  reel_poster: string;
  phone: string;
  whatsapp_number?: string;
  email: string;
  opening_hours_label: string;
  opening_hours: { day: string; open: string; close: string }[];
  online_ordering_enabled: boolean;
  delivery_fee: number;
  free_delivery_above: number;
}
