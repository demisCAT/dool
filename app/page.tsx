import { CartProvider } from "@/components/store/cart-provider";
import { Header } from "@/components/store/header";
import { Hero } from "@/components/store/hero";
import { HowItWorks } from "@/components/store/how-it-works";
import { MenuSection } from "@/components/store/menu-section";
import { OrderForm } from "@/components/store/order-form";
import { Footer } from "@/components/store/footer";
import { getStoreData } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const { categories, products } = hasEnv
    ? await getStoreData()
    : { categories: [], products: [] };

  return (
    <CartProvider>
      <div id="inicio" className="flex min-h-full flex-1 flex-col">
        <Header />
        <main className="flex-1">
          {!hasEnv && (
            <div className="border-b border-butter/40 bg-butter/15 px-5 py-3 text-center text-sm font-semibold text-butter-deep">
              Configura las variables de Supabase en .env.local para conectar el
              catálogo.
            </div>
          )}
          <Hero products={products} />
          <HowItWorks />
          <MenuSection categories={categories} products={products} />
          <OrderForm />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
