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
import { Plus, Trash2, Eye } from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";

export default function ProductsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Check store status
  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Stores use 'status' field: 'live' | 'maintenance' | 'unpaid'
        // 'isLive' in older code meant strict boolean, here we check status string
        setIsLive(data.status === "live");
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

  if (storeLoading || !storeId) {
    return <div className="p-8">Loading store context...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-zinc-500">Manage your drop items</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          Add Product
        </button>
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
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-medium border-b border-zinc-100 dark:border-zinc-800">
              <tr>
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
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
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
      )}

      {isFormOpen && (
        <ProductForm
          storeId={storeId}
          initialData={editingProduct}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
