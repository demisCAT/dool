"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product, Side } from "@/lib/types";

interface CartContextValue {
  items: CartItem[];
  total: number;
  count: number;
  add: (product: Product, side: Side | null) => void;
  remove: (productId: string, side: Side | null) => void;
  setQty: (productId: string, side: Side | null, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "divina-natales-cart";

function itemKey(productId: string, side: Side | null): string {
  return side ? `${productId}:${side.id}` : productId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura inicial de localStorage, patrón recomendado para persistencia externa
        setItems(parsed.map((i) => ({ product: i.product, qty: i.qty, side: i.side ?? null })));
      }
    } catch {
      // carrito corrupto: empezar vacío
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // almacenamiento no disponible
    }
  }, [items]);

  const add = useCallback((product: Product, side: Side | null) => {
    setItems((prev) => {
      const key = itemKey(product.id, side);
      const existing = prev.find(
        (i) => itemKey(i.product.id, i.side) === key
      );
      if (existing) {
        return prev.map((i) =>
          itemKey(i.product.id, i.side) === key ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1, side }];
    });
  }, []);

  const remove = useCallback((productId: string, side: Side | null) => {
    const key = itemKey(productId, side);
    setItems((prev) =>
      prev.filter((i) => itemKey(i.product.id, i.side) !== key)
    );
  }, []);

  const setQty = useCallback(
    (productId: string, side: Side | null, qty: number) => {
      const key = itemKey(productId, side);
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => itemKey(i.product.id, i.side) !== key)
          : prev.map((i) =>
              itemKey(i.product.id, i.side) === key ? { ...i, qty } : i
            )
      );
    },
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce(
      (sum, i) => sum + i.product.price * i.qty,
      0
    );
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    return { items, total, count, add, remove, setQty, clear };
  }, [items, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
