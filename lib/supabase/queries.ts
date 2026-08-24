import { createServerClientInstance } from "./server";
import type { Category, Product } from "@/lib/types";

export async function getStoreData(): Promise<{
  categories: Category[];
  products: Product[];
}> {
  const supabase = await createServerClientInstance();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, position")
      .order("position"),
    supabase
      .from("products")
      .select(
        "id, category_id, name, description, price, image_url, active, position"
      )
      .eq("active", true)
      .order("position"),
  ]);

  if (categoriesResult.error) {
    console.error("Error cargando categorías:", categoriesResult.error.message);
  }
  if (productsResult.error) {
    console.error("Error cargando productos:", productsResult.error.message);
  }

  return {
    categories: (categoriesResult.data as Category[]) ?? [],
    products: (productsResult.data as Product[]) ?? [],
  };
}
