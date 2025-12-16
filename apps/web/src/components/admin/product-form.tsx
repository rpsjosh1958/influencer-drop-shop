"use client";

import { useState, useRef, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Loader2, Upload, X } from "lucide-react";
import { Product } from "@/types";

interface ProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product;
}

export function ProductForm({
  onClose,
  onSuccess,
  initialData,
}: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.imageUrl || null
  );

  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill refs if editing
  useEffect(() => {
    if (initialData) {
      if (nameRef.current) nameRef.current.value = initialData.name;
      if (priceRef.current)
        priceRef.current.value = initialData.price.toString();
      if (stockRef.current)
        stockRef.current.value = initialData.stock.toString();
      if (descRef.current) descRef.current.value = initialData.description;
    }
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile && !initialData) return alert("Please select an image");

    setLoading(true);
    try {
      let downloadURL = initialData?.imageUrl;
      let imagePath = initialData?.imagePath;

      // 1. Upload Image (only if changed)
      if (imageFile) {
        const storageRef = ref(
          storage,
          `products/${Date.now()}-${imageFile.name}`
        );
        const snapshot = await uploadBytes(storageRef, imageFile);
        downloadURL = await getDownloadURL(snapshot.ref);
        imagePath = snapshot.metadata.fullPath;
      }

      const productData = {
        name: nameRef.current?.value,
        price: parseFloat(priceRef.current?.value || "0"),
        stock: parseInt(stockRef.current?.value || "0"),
        description: descRef.current?.value,
        imageUrl: downloadURL,
        imagePath: imagePath,
      };

      // 2. Save Product to Firestore
      if (initialData) {
        // Update
        await updateDoc(doc(db, "products", initialData.id), productData);
      } else {
        // Create
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: serverTimestamp(),
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving product: ", error);
      alert("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold">
            {initialData ? "Edit Item" : "New Drop Item"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload */}
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <div className="w-32 h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <span className="text-xs text-center block mt-2 text-zinc-500">
                {initialData ? "Tap to change" : "Tap to upload"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                ref={nameRef}
                required
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border-transparent focus:ring-2 ring-black dark:ring-white transition-all shadow-sm"
                placeholder="T-Shirt"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Price (GHS)
              </label>
              <input
                ref={priceRef}
                type="number"
                step="0.01"
                required
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border-transparent focus:ring-2 ring-black dark:ring-white transition-all shadow-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stock</label>
            <input
              ref={stockRef}
              type="number"
              required
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border-transparent focus:ring-2 ring-black dark:ring-white transition-all shadow-sm"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              ref={descRef}
              rows={3}
              className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl border-transparent focus:ring-2 ring-black dark:ring-white transition-all shadow-sm"
              placeholder="Product details..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading
              ? "Saving..."
              : initialData
              ? "Update Item"
              : "Publish Item"}
          </button>
        </form>
      </div>
    </div>
  );
}
