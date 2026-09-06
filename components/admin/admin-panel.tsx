"use client";

import { useRef, useState, useActionState } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  saveProduct,
  deleteProduct,
  toggleProductActive,
  saveCategory,
  deleteCategory,
  signOut,
} from "@/app/admin/actions";

type Tab = "productos" | "categorias";

const EMPTY_PRODUCT = {
  id: "",
  name: "",
  description: "",
  price: "",
  category_id: "",
  image_url: "",
  active: true,
  with_side: false,
  position: "0",
};

export function AdminPanel({
  categories,
  products,
  adminEmail,
}: {
  categories: Category[];
  products: Product[];
  adminEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("productos");
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [productState, productAction, productPending] = useActionState(
    saveProduct,
    { error: null, ok: false }
  );
  const [categoryState, categoryAction, categoryPending] = useActionState(
    saveCategory,
    { error: null, ok: false }
  );

  const [prevOk, setPrevOk] = useState({ product: false, category: false });

  if (productState.ok !== prevOk.product) {
    setPrevOk((s) => ({ ...s, product: productState.ok ?? false }));
    if (productState.ok) {
      setProduct(EMPTY_PRODUCT);
      setShowForm(false);
      setFormKey((k) => k + 1);
    }
  }

  if (categoryState.ok !== prevOk.category) {
    setPrevOk((s) => ({ ...s, category: categoryState.ok ?? false }));
    if (categoryState.ok) {
      setFormKey((k) => k + 1);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("La imagen no debe superar 5 MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("products")
        .upload(path, file, { upsert: false });
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("products").getPublicUrl(path);

      setProduct((p) => ({ ...p, image_url: publicUrl }));
    } catch {
      setUploadError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(p: Product) {
    setTab("productos");
    setProduct({
      id: p.id,
      name: p.name,
      description: p.description,
      price: String(p.price),
      category_id: p.category_id,
      image_url: p.image_url ?? "",
      active: p.active,
      with_side: p.with_side ?? false,
      position: String(p.position),
    });
    setUploadError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startCreate() {
    setProduct(EMPTY_PRODUCT);
    setShowForm((v) => !v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const orderedCategories = [...categories].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-pine">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <p className="font-display text-xl text-chalk">
            Divina Natales{" "}
            <span className="font-hand text-lg text-butter">· cocina</span>
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-chalk/70 transition-colors hover:text-chalk"
            >
              Ver tienda
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-semibold text-chalk/70 transition-colors hover:text-chalk"
                title={`Sesión: ${adminEmail}`}
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="paper-grain mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div role="tablist" className="flex gap-2">
          <button
            role="tab"
            aria-selected={tab === "productos"}
            onClick={() => setTab("productos")}
            className={`rounded-t-lg px-5 py-2.5 font-bold transition-colors ${
              tab === "productos"
                ? "bg-paper text-pine shadow-sm"
                : "text-ink/50 hover:text-pine"
            }`}
          >
            Productos
          </button>
          <button
            role="tab"
            aria-selected={tab === "categorias"}
            onClick={() => setTab("categorias")}
            className={`rounded-t-lg px-5 py-2.5 font-bold transition-colors ${
              tab === "categorias"
                ? "bg-paper text-pine shadow-sm"
                : "text-ink/50 hover:text-pine"
            }`}
          >
            Categorías
          </button>
        </div>

        <div className="rounded-b-lg rounded-tr-lg bg-paper p-6 shadow-md shadow-ink/8">
          {tab === "productos" ? (
            <>
              {showForm && (
                <ProductForm
                  key={`p-${formKey}`}
                  product={product}
                  setProduct={setProduct}
                  categories={orderedCategories}
                  action={productAction}
                  pending={productPending}
                  state={productState}
                  uploading={uploading}
                  uploadError={uploadError}
                  fileRef={fileRef}
                  onFile={handleFile}
                  onCancel={() => setShowForm(false)}
                />
              )}
              <ProductList
                products={products}
                categories={orderedCategories}
                onEdit={startEdit}
                onAdd={startCreate}
              />
            </>
          ) : (
            <>
              <CategoryForm
                key={`c-${formKey}`}
                action={categoryAction}
                pending={categoryPending}
                state={categoryState}
              />
              <CategoryList
                categories={orderedCategories}
                products={products}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ProductForm({
  product,
  setProduct,
  categories,
  action,
  pending,
  state,
  uploading,
  uploadError,
  fileRef,
  onFile,
  onCancel,
}: {
  product: typeof EMPTY_PRODUCT;
  setProduct: React.Dispatch<React.SetStateAction<typeof EMPTY_PRODUCT>>;
  categories: Category[];
  action: (formData: FormData) => void;
  pending: boolean;
  state: { error: string | null; ok?: boolean };
  uploading: boolean;
  uploadError: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(product.id);
  const set = (patch: Partial<typeof EMPTY_PRODUCT>) =>
    setProduct((p) => ({ ...p, ...patch }));

  return (
    <section className="border-b-2 border-dashed border-ink/10 pb-8">
      <h2 className="font-display text-2xl text-pine">
        {isEditing ? "Editar producto" : "Nuevo producto"}
      </h2>

      <form action={action} className="mt-5 flex flex-col gap-4">
        {product.id && <input type="hidden" name="id" value={product.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-name" className="text-sm font-bold text-pine">
              Nombre
            </label>
            <input
              id="p-name"
              name="name"
              required
              value={product.name}
              onChange={(e) => set({ name: e.target.value })}
              className="h-11 rounded-lg border-2 border-ink/15 bg-cream px-3 focus:border-butter-deep focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-price" className="text-sm font-bold text-pine">
              Precio (CLP)
            </label>
            <input
              id="p-price"
              name="price"
              type="number"
              min={0}
              step={100}
              required
              value={product.price}
              onChange={(e) => set({ price: e.target.value })}
              className="h-11 rounded-lg border-2 border-ink/15 bg-cream px-3 focus:border-butter-deep focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="p-desc" className="text-sm font-bold text-pine">
            Descripción
          </label>
          <textarea
            id="p-desc"
            name="description"
            rows={2}
            value={product.description}
            onChange={(e) => set({ description: e.target.value })}
            className="rounded-lg border-2 border-ink/15 bg-cream px-3 py-2 focus:border-butter-deep focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-cat" className="text-sm font-bold text-pine">
              Categoría
            </label>
            <select
              id="p-cat"
              name="category_id"
              required
              value={product.category_id}
              onChange={(e) => set({ category_id: e.target.value })}
              className="h-11 rounded-lg border-2 border-ink/15 bg-cream px-3 focus:border-butter-deep focus:outline-none"
            >
              <option value="">Elige una categoría…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-pos" className="text-sm font-bold text-pine">
              Orden de aparición
            </label>
            <input
              id="p-pos"
              name="position"
              type="number"
              value={product.position}
              onChange={(e) => set({ position: e.target.value })}
              className="h-11 rounded-lg border-2 border-ink/15 bg-cream px-3 focus:border-butter-deep focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-pine">Fotografía</span>
          <div className="flex items-center gap-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => onFile(e.target.files?.[0])}
              className="text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-butter file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink hover:file:bg-butter-deep disabled:opacity-50"
            />
            {uploading && (
              <span className="text-sm font-semibold text-butter-deep">
                Subiendo…
              </span>
            )}
          </div>
          {uploadError && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {uploadError}
            </p>
          )}
          {product.image_url && (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url}
                alt="Vista previa"
                className="h-20 w-28 rounded-md object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => set({ image_url: "" })}
                className="text-sm font-semibold text-red-700 hover:underline"
              >
                Quitar foto
              </button>
            </div>
          )}
          <input type="hidden" name="image_url" value={product.image_url} />
        </div>

        <label className="flex w-fit items-center gap-2 text-sm font-bold text-pine">
          <input
            type="checkbox"
            name="with_side"
            checked={product.with_side}
            onChange={(e) => set({ with_side: e.target.checked })}
            className="h-4 w-4 accent-[#1e3b32]"
          />
          Va con acompañamiento
        </label>

        <label className="flex w-fit items-center gap-2 text-sm font-bold text-pine">
          <input
            type="checkbox"
            name="active"
            checked={product.active}
            onChange={(e) => set({ active: e.target.checked })}
            className="h-4 w-4 accent-[#1e3b32]"
          />
          Visible en la tienda
        </label>

        {state.error && (
          <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-md bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">
            Producto guardado.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending || uploading}
            className="inline-flex h-11 items-center rounded-full bg-pine px-7 font-bold text-chalk transition-colors hover:bg-pine-deep disabled:opacity-60"
          >
            {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear producto"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-full border-2 border-ink/15 px-6 font-bold text-ink/70 transition-colors hover:border-pine hover:text-pine"
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductList({
  products,
  categories,
  onEdit,
  onAdd,
}: {
  products: Product[];
  categories: Category[];
  onEdit: (p: Product) => void;
  onAdd: () => void;
}) {
  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Sin categoría";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-pine">
          Productos ({products.length})
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-10 items-center rounded-full bg-pine px-5 text-sm font-bold text-chalk transition-colors hover:bg-pine-deep"
        >
          Nuevo producto
        </button>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-center text-ink/55">
          Aún no hay productos. Crea el primero con el botón &quot;Nuevo producto&quot;.
        </p>
      ) : (
        <>
          <div className="mt-4 hidden grid-cols-[3rem_4rem_minmax(0,1fr)_7rem_5rem_10rem] items-center gap-4 border-b border-ink/10 pb-2 text-xs font-bold uppercase tracking-wide text-ink/45 sm:grid">
            <span className="text-center">Disp.</span>
            <span>Foto</span>
            <span>Producto</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Acomp.</span>
            <span className="text-left">Acciones</span>
          </div>
          <ul className="divide-y divide-ink/10">
            {products.map((p) => (
              <li key={p.id} className="grid grid-cols-[3rem_4rem_minmax(0,1fr)_7rem_5rem_10rem] items-center gap-4 py-3">
                <form
                  className="flex justify-center"
                  action={toggleProductActive.bind(null, p.id, !p.active)}
                >
                  <button
                    type="submit"
                    role="switch"
                    aria-checked={p.active}
                    title={p.active ? "Desactivar plato" : "Activar plato"}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-butter-deep ${
                      p.active ? "bg-pine" : "bg-ink/25"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-chalk shadow transition-transform ${
                        p.active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </form>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-12 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 items-center justify-center rounded-md bg-pine/10">
                    <span className="font-display text-[10px] text-pine/40">DN</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-pine">{p.name}</p>
                  <p className="text-sm text-ink/55">{catName(p.category_id)}</p>
                </div>
                <span className="text-right font-display text-lg text-butter-deep">
                  {formatPrice(p.price)}
                </span>
                <span className="text-center text-sm font-bold text-ink/70">
                  {p.with_side ? "Sí" : "—"}
                </span>
                <div className="flex justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="rounded-full border-2 border-ink/15 px-4 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-pine hover:text-pine"
                  >
                    Editar
                  </button>
                  <form action={deleteProduct.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-full border-2 border-ink/15 px-4 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-red-700 hover:text-red-700"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CategoryForm({
  action,
  pending,
  state,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  state: { error: string | null; ok?: boolean };
}) {
  return (
    <section className="border-b-2 border-dashed border-ink/10 pb-8">
      <h2 className="font-display text-2xl text-pine">Nueva categoría</h2>
      <form action={action} className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-name" className="text-sm font-bold text-pine">
            Nombre
          </label>
          <input
            id="c-name"
            name="name"
            required
            className="h-11 max-w-sm rounded-lg border-2 border-ink/15 bg-cream px-3 focus:border-butter-deep focus:outline-none"
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-md bg-green-100 px-3 py-2 text-sm font-semibold text-green-800">
            Categoría creada.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-fit items-center rounded-full bg-pine px-7 font-bold text-chalk transition-colors hover:bg-pine-deep disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear categoría"}
        </button>
      </form>
    </section>
  );
}

function CategoryList({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl text-pine">
        Categorías ({categories.length})
      </h2>
      {categories.length === 0 ? (
        <p className="mt-4 text-center text-ink/55">
          Aún no hay categorías. Crea la primera arriba.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10">
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            return (
              <li key={c.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-pine">{c.name}</p>
                  <p className="text-sm text-ink/55">
                    {count} {count === 1 ? "producto" : "productos"}
                  </p>
                </div>
                {count === 0 ? (
                  <form action={deleteCategory.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="rounded-full border-2 border-ink/15 px-4 py-1.5 text-sm font-bold text-ink/70 transition-colors hover:border-red-700 hover:text-red-700"
                    >
                      Borrar
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Mueve o borra sus productos primero"
                    className="rounded-full border-2 border-ink/15 px-4 py-1.5 text-sm font-bold text-ink/70 cursor-not-allowed opacity-40"
                  >
                    Borrar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
