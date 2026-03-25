"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { ProductForm } from "@/components/admin/product-form";
import { useAdminStore } from "@/components/admin/admin-store-provider";

import { ShareModal } from "@/components/admin/share-modal";
import { toPng } from "html-to-image";
import { PromoCard } from "@/components/admin/promo-card";
import { HelpTrigger, useOnboarding } from "@/context/onboarding-context";
import { cn } from "@/lib/utils";

// New Refactored Components
import { AdminProductTable } from "@/components/admin/product-table";
import { AdminProductCardMobile } from "@/components/admin/product-card-mobile";

// Lucide Icons Import Fix
import { Plus as PlusIcon, Trash2 as TrashIcon, Download as DownloadIcon, Share2 as ShareIcon, Loader2, Search } from "lucide-react";

export default function ProductsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const { currentStepTarget } = useOnboarding();
  const queryClient = useQueryClient();

  // 1. Fetch Store Status (Query)
  const { data: storeData } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const snap = await getDoc(doc(db, "stores", storeId));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!storeId,
  });

   const isLive = storeData?.status === "live";
   const storeSlug = storeData?.slug || "";
   const storeName = storeData?.name || "Store";
   const storeLogo = storeData?.logo || "";
   
   // Search State
   const [searchTerm, setSearchTerm] = useState("");
   
   // 2. Fetch Products (Query) - always fetch all products for client-side filtering
   // We'll handle search client-side for immediate feedback
   const { data: allProducts = [], isLoading: productsLoading } = useQuery({
     queryKey: ["products", storeId],
     queryFn: async () => {
       if (!storeId) return [];
       const q = query(
         collection(db, "stores", storeId, "products"),
         orderBy("createdAt", "desc")
       );
       const snapshot = await getDocs(q);
       return snapshot.docs.map((doc) => ({
         id: doc.id,
         ...doc.data(),
       })) as Product[];
     },
     enabled: !!storeId,
   });
   
   // Client-side filtered products (for immediate feedback as user types)
   const products = useMemo(() => {
     if (!searchTerm) return allProducts;
     
     // Case-insensitive search for better UX
     const searchLower = searchTerm.toLowerCase();
     return allProducts.filter(product => 
       product.name.toLowerCase().includes(searchLower)
     );
   }, [allProducts, searchTerm]);

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storeId) return;
      await deleteDoc(doc(db, "stores", storeId, "products", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });
    },
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [productToShare, setProductToShare] = useState<Product | null>(null);

  // Bulk Selection & Generation State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
      setSelectedIds((prev) => prev.filter((pid) => pid !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!storeId || selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} products permanently?`)) {
      setIsBulkDeleting(true);
      try {
        for (const id of selectedIds) {
          await deleteDoc(doc(db, "stores", storeId, "products", id));
        }
        queryClient.invalidateQueries({ queryKey: ["products", storeId] });
        setSelectedIds([]);
      } finally {
        setIsBulkDeleting(false);
      }
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

  const loading = productsLoading || isBulkDeleting;

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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Inventory
            <HelpTrigger category="products" />
          </h1>
          <p className="text-zinc-500">Manage your drop items</p>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop search */}
            <div className="hidden md:block relative w-48 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="pl-9 pr-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none w-full"
              />
            </div>
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
                 <DownloadIcon
                   size={18}
                   className={generatingBulk ? "animate-bounce" : ""}
                 />
                 {generatingBulk
                   ? "Generating..."
                   : `Download Images (${selectedIds.length})`}
               </button>
 
               <button
                 onClick={handleBulkDelete}
                 disabled={isBulkDeleting}
                 className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors animate-in fade-in zoom-in"
               >
                 {isBulkDeleting ? <Loader2 className="animate-spin" size={18} /> : <TrashIcon size={18} />}
                 Delete ({selectedIds.length})
               </button>
             </div>
           )}
           <button
             data-tour="products-add"
             onClick={handleAdd}
             className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
           >
             <PlusIcon size={20} />
             Add Product
           </button>
          </div>
       </div>

       {/* Mobile search: under header, before mobile select-all */}
       <div className="md:hidden mt-2">
         <div className="relative w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
           <input
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="Search products..."
             className="pl-9 pr-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none w-full"
           />
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
          onSuccess={() => {
            setIsFormOpen(false);
            queryClient.invalidateQueries({ queryKey: ["products", storeId] });
          }}
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
