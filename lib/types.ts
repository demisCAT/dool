export interface Category {
  id: string;
  name: string;
  slug: string;
  position: number;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  active: boolean;
  with_side: boolean;
  position: number;
}

export interface Side {
  id: string;
  name: string;
  description: string;
  active: boolean;
  position: number;
}

export interface CartItem {
  product: Product;
  qty: number;
  side: Side | null;
  /** Precio al momento de guardar el pedido (solo para el historial del admin). */
  unit_price?: number;
}

export type FulfillmentMode = "pickup" | "delivery";

export interface OrderForm {
  name: string;
  phone: string;
  deliveryDate: string;
  fulfillmentMode: FulfillmentMode | "";
  address: string;
  deliveryPlaceId: string;
  note: string;
  /** El usuario no encontró su dirección exacta y usará la más cercana. */
  needsNearestAddress: boolean;
}

export type OrderStatus = "pendiente" | "recibido";

export interface Order {
  id: string;
  name: string;
  phone: string;
  delivery_date: string;
  fulfillment_mode: FulfillmentMode;
  address: string;
  delivery_fee: number;
  delivery_distance_m: number | null;
  note: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
}

export interface RetentionSettings {
  pendingDays: number;
  receivedDays: number;
  noSideDiscount: number;
  deliveryFee: number;
  deliveryFeeOver2Km: number | null;
}
