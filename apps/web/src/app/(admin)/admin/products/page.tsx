"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2, Eye, Share2 } from "lucide-react"; // Added Share2
import { useAdminStore } from "@/components/admin/admin-store-provider";

import { ShareModal } from "@/components/admin/share-modal";
import { toPng } from "html-to-image";
import { PromoCard } from "@/components/admin/promo-card";
import { Download } from "lucide-react";

export default function ProductsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );
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

  const handleBulkDownload = async () => {
    setGeneratingBulk(true);
    try {
      const container = document.getElementById("bulk-promo-container");
      if (!container) return;

      const cards = container.querySelectorAll(".bulk-card-item"); // We'll add this class

      for (let i = 0; i < cards.length; i++) {
        const wrapper = cards[i] as HTMLElement; // This is the wrapper with mb-4
        // Logic: Get the ACTUAL card element (first child)
        const promoCard = wrapper.firstElementChild as HTMLElement;

        if (!promoCard) continue;

        const productName =
          wrapper.getAttribute("data-product-name") || "product";

        const dataUrl = await toPng(promoCard, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: "#000000",
        });

        const link = document.createElement("a");
        link.download = `drop-${productName
          .toLowerCase()
          .replace(/\s+/g, "-")}.png`;
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
    return <div className="p-8">Loading store context...</div>;
  }

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-zinc-500">Manage your drop items</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
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
            </>
          )}
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">
          Loading inventory...
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
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-medium border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 w-[50px]">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === products.length &&
                        products.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`transition-colors ${
                      selectedIds.includes(product.id)
                        ? "bg-zinc-50 dark:bg-zinc-800/80"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      GHS {product.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock > 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleShare(product)}
                        className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="Share Product"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        disabled={isLive}
                        title={isLive ? "Cannot edit while LIVE" : "Edit Item"}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isLive
                            ? "text-zinc-300 cursor-not-allowed"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {isLive ? "Locked" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden space-y-4">
            {/* Mobile Select All Bar */}
            {products.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === products.length &&
                    products.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 accent-black cursor-pointer"
                />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Select All
                </span>
              </div>
            )}

            {products.map((product) => (
              <div
                key={product.id}
                className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border transition-colors ${
                  selectedIds.includes(product.id)
                    ? "border-black dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/30"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    className="w-5 h-5 mt-1 rounded border-zinc-300 accent-black cursor-pointer flex-shrink-0"
                  />

                  {/* Image */}
                  <div className="h-16 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-base truncate pr-2">
                        {product.name}
                      </h3>
                      <span className="font-mono text-sm font-bold">
                        GHS {product.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          product.stock > 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {product.stock} Stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleShare(product)}
                    className="flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    disabled={isLive}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-lg ${
                      isLive
                        ? "text-zinc-300 bg-zinc-50 cursor-not-allowed"
                        : "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    }`}
                  >
                    {isLive ? "Locked" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-none p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
