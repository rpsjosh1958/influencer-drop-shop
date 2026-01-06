"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Category } from "@/types";
import { Plus, Trash2, Tag, AlertCircle } from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";

export default function CategoriesPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!storeId) {
      if (!storeLoading) setLoading(false);
      return;
    }

    // Scoped to Store
    const q = query(
      collection(db, "stores", storeId, "categories"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(items);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId, storeLoading]);

  const handleAddKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleAdd = async () => {
    if (!newCatName.trim() || !storeId) return;
    setAdding(true);
    try {
      const slug = newCatName.toLowerCase().replace(/\s+/g, "-");
      // Scoped to Store
      await addDoc(collection(db, "stores", storeId, "categories"), {
        name: newCatName,
        slug,
        createdAt: serverTimestamp(),
      });
      setNewCatName("");
    } catch (e) {
      console.error(e);
      alert("Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    if (confirm("Delete this category?")) {
      // Scoped to Store
      await deleteDoc(doc(db, "stores", storeId, "categories", id));
    }
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <AlertCircle size={48} className="text-zinc-300 mb-4" />
        <h3 className="font-bold text-lg mb-2">No Store Selection</h3>
        <p className="text-zinc-500 max-w-md">
          Please select a store from the dashboard to manage categories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-zinc-500">
          Manage product categories for this store
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 sticky top-8">
            <h2 className="font-bold mb-4">Add Category</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">
                  Category Name
                </label>
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={handleAddKey}
                  placeholder="e.g. Streetwear"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !newCatName}
                className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adding ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus size={18} /> Add Category
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
              <Tag className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-zinc-500">
                No categories found in this store.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                      <Tag size={18} />
                    </div>
                    <div>
                      <p className="font-bold">{cat.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">
                        /{cat.slug}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
