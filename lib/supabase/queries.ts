import { createServerClientInstance } from "./server";
import type { Category, Product, Side } from "@/lib/types";

export async function getStoreData(): Promise<{
  categories: Category[];
  products: Product[];
  sides: Side[];
}> {
  const supabase = await createServerClientInstance();

  const [categoriesResult, productsResult, sidesResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, position")
      .order("position"),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, active, with_side, position"
      )
      .eq("active", true)
      .order("position"),
    supabase
      .from("sides")
      .select("id, name, description, active, position")
      .eq("active", true)
      .order("position"),
  ]);

  if (categoriesResult.error) {
    console.error("Error cargando categorías:", categoriesResult.error.message);
  }
  if (productsResult.error) {
    console.error("Error cargando productos:", productsResult.error.message);
  }
  if (sidesResult.error) {
    console.error("Error cargando acompañamientos:", sidesResult.error.message);
  }

  return {
    categories: (categoriesResult.data as Category[]) ?? [],
    products: (productsResult.data as Product[]) ?? [],
    sides: (sidesResult.data as Side[]) ?? [],
  };
}
