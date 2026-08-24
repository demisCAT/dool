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
  position: number;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface OrderForm {
  name: string;
  phone: string;
  deliveryDate: string;
  note: string;
}
