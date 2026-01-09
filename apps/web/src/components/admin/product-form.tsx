"use client";

import { useState, useRef, useEffect } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  orderBy,
  query,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Loader2, Upload, X } from "lucide-react";
import { Product, Category, ProductOption, ProductVariant } from "@/types";

interface ProductFormProps {
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product;
}

export function ProductForm({
  storeId,
  onClose,
  onSuccess,
  initialData,
}: ProductFormProps) {
  const [loading, setLoading] = useState(false);

  // Basic Info
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Stock (Global if no variants)
  const stockRef = useRef<HTMLInputElement>(null);

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    initialData?.images || (initialData?.imageUrl ? [initialData.imageUrl] : [])
  );

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(items);
    });
    return () => unsub();
  }, []);
  const categoryRef = useRef<HTMLSelectElement>(null);

  // Pre-fill
  useEffect(() => {
    if (initialData) {
      if (nameRef.current) nameRef.current.value = initialData.name;
      if (priceRef.current)
        priceRef.current.value = initialData.price.toString();
      if (stockRef.current)
        stockRef.current.value = initialData.stock.toString();
      if (descRef.current) descRef.current.value = initialData.description;
      if (categoryRef.current)
        categoryRef.current.value = initialData.category || "";
    }
  }, [initialData, categories]);

  // --- IMAGES ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + imageFiles.length + previewUrls.length > 5) {
        alert("Maximum 5 images allowed");
        return;
      }
      setImageFiles((prev) => [...prev, ...files]);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    // Note: Does not perfectly sync with imageFiles removal for simplicity
  };

  // --- ADVANCED VARIANTS ---
  const [hasVariants, setHasVariants] = useState(
    initialData?.hasVariants || false
  );
  const [options, setOptions] = useState<ProductOption[]>(
    initialData?.options || []
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    initialData?.variants || []
  );

  // Helper: Generate Cartesian Product of Options
  const generateVariants = (currentOptions: ProductOption[]) => {
    const validOptions = currentOptions.filter(
      (o) => o.name && o.values.length > 0
    );
    if (validOptions.length === 0) return [];

    // Cartesian product
    const cartesian = (sets: string[][]) =>
      sets.reduce<string[][]>(
        (acc, set) => acc.flatMap((x) => set.map((y) => [...x, y])),
        [[]]
      );

    const values = validOptions.map((o) => o.values);
    const combinations = cartesian(values);

    const newVariants: ProductVariant[] = combinations.map((combo) => {
      // Map option names to values for this combination
      const optionsMap: Record<string, string> = {};
      validOptions.forEach((opt, idx) => {
        optionsMap[opt.name] = combo[idx];
      });

      const name = combo.join(" / ");

      // Check if variant already exists (preserve ID, stock, specific price)
      const existing = variants.find((v) => {
        // Match by options map content
        const keys = Object.keys(v.options);
        if (keys.length !== Object.keys(optionsMap).length) return false;
        return keys.every((k) => v.options[k] === optionsMap[k]);
      });

      if (existing) return existing;

      // Create new
      return {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        name,
        options: optionsMap,
        stock: 0,
        price: parseFloat(priceRef.current?.value || "0"), // Default to base price
      };
    });

    return newVariants;
  };

  useEffect(() => {
    if (hasVariants) {
      const generated = generateVariants(options);
      setVariants(generated);
    } else {
      setVariants([]);
    }
  }, [options, hasVariants]);

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", values: [] },
    ]);
  };

  const updateOptionName = (idx: number, name: string) => {
    const newOptions = [...options];
    newOptions[idx].name = name;
    setOptions(newOptions);
  };

  const updateOptionValues = (idx: number, valStr: string) => {
    const newOptions = [...options];
    // Split by comma, trim whitespace
    const values = valStr
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    newOptions[idx].values = values;
    setOptions(newOptions);
  };

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVariant = (
    id: string,
    field: "price" | "stock",
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const num = parseFloat(value);
          return { ...v, [field]: isNaN(num) ? 0 : num };
        }
        return v;
      })
    );
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewUrls.length === 0)
      return alert("Please upload at least one image");
    if (hasVariants && variants.length === 0)
      return alert("Please define options and variants");

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      const existingUrls = previewUrls.filter(
        (url) => !url.startsWith("blob:")
      );
      imageUrls.push(...existingUrls);

      for (const file of imageFiles) {
        const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      const totalStock = hasVariants
        ? variants.reduce((acc, v) => acc + v.stock, 0)
        : parseInt(stockRef.current?.value || "0");

      const productData = {
        name: nameRef.current?.value,
        price: parseFloat(priceRef.current?.value || "0"),
        description: descRef.current?.value,
        stock: totalStock,
        category: categoryRef.current?.value || "",
        images: imageUrls,
        imageUrl: imageUrls[0],
        hasVariants,
        options: hasVariants ? options : [],
        variants: hasVariants ? variants : [],
      };

      if (initialData) {
        await updateDoc(
          doc(db, "stores", storeId, "products", initialData.id),
          productData
        );
      } else {
        await addDoc(collection(db, "stores", storeId, "products"), {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl font-bold">
            {initialData ? "Edit Item" : "New Drop Item"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-8 max-h-[80vh] overflow-y-auto"
        >
          {/* Section 1: Images & Core Info */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Images */}
            <div>
              <label className="block text-sm font-bold mb-3">Gallery</label>
              <div className="grid grid-cols-3 gap-3">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 group"
                  >
                    <img src={url} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previewUrls.length < 5 && (
                  <label className="relative cursor-pointer aspect-square rounded-xl bg-zinc-50 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center hover:bg-zinc-100 transition-colors">
                    <Upload className="text-zinc-400 mb-1" size={20} />
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">
                      Add
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Right: Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Name</label>
                <input
                  ref={nameRef}
                  required
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black"
                  placeholder="e.g. Graphic Tee"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Price</label>
                  <input
                    ref={priceRef}
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Category
                  </label>
                  <select
                    ref={categoryRef}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black appearance-none"
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">
                  Description
                </label>
                <textarea
                  ref={descRef}
                  rows={3}
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black"
                  placeholder="Details..."
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 dark:border-zinc-800" />

          {/* Section 2: Variants & Stock */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Options & Inventory</h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="w-4 h-4 rounded text-black focus:ring-black"
                />
                <label
                  htmlFor="hasVariants"
                  className="text-sm font-medium cursor-pointer"
                >
                  This product has options (Size, Color...)
                </label>
              </div>
            </div>

            {!hasVariants ? (
              <div className="bg-zinc-200 p-4 rounded-xl max-w-xs">
                <label className="block text-sm text-black font-bold mb-1">
                  Total Stock
                </label>
                <input
                  ref={stockRef}
                  type="number"
                  required
                  className="w-full p-3 bg-white text-black border border-zinc-200 rounded-xl outline-none ring-black"
                  placeholder="100"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Options Builder */}
                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="flex flex-col md:flex-row items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100"
                    >
                      <div className="w-full md:w-1/3">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">
                          Option Name
                        </label>
                        <input
                          value={opt.name}
                          onChange={(e) =>
                            updateOptionName(idx, e.target.value)
                          }
                          placeholder="e.g. Size"
                          className="w-full p-2 text-sm text-black border border-zinc-200 rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">
                          Values (comma separated)
                        </label>
                        <input
                          defaultValue={opt.values.join(", ")}
                          onBlur={(e) =>
                            updateOptionValues(idx, e.target.value)
                          }
                          placeholder="S, M, L, XL"
                          className="w-full p-2 text-sm text-black border border-zinc-200 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm font-bold text-blue-600 hover:underline px-2"
                  >
                    + Add Option
                  </button>
                </div>

                {/* Variants Table */}
                {variants.length > 0 && (
                  <div className="border border-zinc-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="p-3 font-bold text-zinc-500">
                            Variant
                          </th>
                          <th className="p-3 font-bold text-zinc-500 w-32">
                            Price
                          </th>
                          <th className="p-3 font-bold text-zinc-500 w-32">
                            Stock
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {variants.map((v) => (
                          <tr key={v.id} className="group hover:bg-zinc-20">
                            <td className="p-3 font-bold">{v.name}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                step="0.01"
                                value={v.price}
                                onChange={(e) =>
                                  updateVariant(v.id, "price", e.target.value)
                                }
                                className="w-full p-2 bg-transparent border border-zinc-200 rounded-lg  ring-black"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={v.stock}
                                onChange={(e) =>
                                  updateVariant(v.id, "stock", e.target.value)
                                }
                                className="w-full p-2 bg-transparent border border-zinc-200 rounded-lg ring-black"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {initialData ? "Save Changes" : "Publish Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
