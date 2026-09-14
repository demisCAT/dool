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
}

export interface OrderForm {
  name: string;
  phone: string;
  deliveryDate: string;
  note: string;
}

export type OrderStatus = "pendiente" | "recibido";

export interface Order {
  id: string;
  name: string;
  phone: string;
  delivery_date: string;
  note: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
}

export interface RetentionSettings {
  pendingDays: number;
  receivedDays: number;
}
