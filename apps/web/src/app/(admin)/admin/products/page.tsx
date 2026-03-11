"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { ProductForm } from "@/components/admin/product-form";
import { Plus, Trash2, Share2, Download } from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";

import { ShareModal } from "@/components/admin/share-modal";
import { toPng } from "html-to-image";
import { PromoCard } from "@/components/admin/promo-card";
import { HelpTrigger, useOnboarding } from "@/context/onboarding-context";
import { cn } from "@/lib/utils";

// New Refactored Components
import { AdminProductTable } from "@/components/admin/product-table";
import { AdminProductCardMobile } from "@/components/admin/product-card-mobile";

export default function ProductsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const { currentStepTarget } = useOnboarding();

  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [storeSlug, setStoreSlug] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeLogo, setStoreLogo] = useState("");

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [productToShare, setProductToShare] = useState<Product | null>(null);

  // Bulk Selection & Generation State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingBulk, setGeneratingBulk] = useState(false);

  // Check store status
  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsLive(data.status === "live");
        setStoreSlug(data.slug || "");
        setStoreName(data.name || "Store");
        setStoreLogo(data.logo || "");
      }
    });
    return () => unsub();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, "stores", storeId, "products"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(items);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, "stores", storeId, "products", id));
      setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!storeId || selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} products permanently?`)) {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "stores", storeId, "products", id));
      }
      setSelectedIds([]);
    }
  };

  const selectedProducts = useMemo(() => 
    products.filter((p) => selectedIds.includes(p.id)),
    [products, selectedIds]
  );

  const handleBulkDownload = async () => {
    setGeneratingBulk(true);
    try {
      const container = document.getElementById("bulk-promo-container");
      if (!container) return;

      const cards = container.querySelectorAll(".bulk-card-item");

      for (let i = 0; i < cards.length; i++) {
        const wrapper = cards[i] as HTMLElement;
        const promoCard = wrapper.firstElementChild as HTMLElement;

        if (!promoCard) continue;

        const productName = wrapper.getAttribute("data-product-name") || "product";

        const dataUrl = await toPng(promoCard, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: "#000000",
        });

        const link = document.createElement("a");
        link.download = `drop-${productName.toLowerCase().replace(/\s+/g, "-")}.png`;
        link.href = dataUrl;
        link.click();

        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      console.error("Bulk generation failed", err);
      alert("Failed to generate some images.");
    } finally {
      setGeneratingBulk(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleShare = (product: Product) => {
    setProductToShare(product);
    setShareModalOpen(true);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  if (storeLoading || !storeId) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* HIDDEN RENDER CONTAINER FOR BULK GENERATION */}
      <div
        id="bulk-promo-container"
        className="fixed left-[-9999px] top-0 pointer-events-none"
      >
        {selectedProducts.map((p) => (
          <div
            key={p.id}
            className="bulk-card-item mb-4"
            data-product-id={p.id}
            data-product-name={p.name}
          >
            <PromoCard
              product={p}
              storeName={storeName}
              storeLogo={storeLogo}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Inventory
            <HelpTrigger category="products" />
          </h1>
          <p className="text-zinc-500">Manage your drop items</p>
        </div>
        <div className="flex items-center gap-2">
          {(selectedIds.length > 0 || currentStepTarget === "products-bulk") && (
            <div 
              data-tour="products-bulk"
              className={cn(
                "flex items-center gap-2 transition-all",
                selectedIds.length === 0 && "opacity-50 pointer-events-none"
              )}
            >
              <button
                onClick={handleBulkDownload}
                disabled={generatingBulk}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition-colors animate-in fade-in zoom-in disabled:opacity-50"
              >
                <Download
                  size={18}
                  className={generatingBulk ? "animate-bounce" : ""}
                />
                {generatingBulk
                  ? "Generating..."
                  : `Download Images (${selectedIds.length})`}
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors animate-in fade-in zoom-in"
              >
                <Trash2 size={18} />
                Delete ({selectedIds.length})
              </button>
            </div>
          )}
          <button
            data-tour="products-add"
            onClick={handleAdd}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
           {[1, 2, 3].map((i) => (
             <div key={i} className="h-20 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse" />
           ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500">No products yet.</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-500 hover:underline"
          >
            Create your first drop item
          </button>
        </div>
      ) : (
        <div data-tour="products-table">
          <AdminProductTable 
            products={products}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            handleShare={handleShare}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            isLive={isLive}
          />

          <div className="md:hidden space-y-4">
            {products.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
                />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Select All
                </span>
              </div>
            )}

            {products.map((product) => (
              <AdminProductCardMobile 
                key={product.id}
                product={product}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                handleShare={handleShare}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                isLive={isLive}
              />
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <ProductForm
          storeId={storeId}
          initialData={editingProduct}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => setIsFormOpen(false)}
        />
      )}

      {productToShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          product={productToShare}
          storeSlug={storeSlug}
          storeName={storeName}
          storeLogo={storeLogo}
        />
      )}
    </div>
  );
}
