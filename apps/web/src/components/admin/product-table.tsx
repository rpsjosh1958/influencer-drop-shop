"use client";

import { Product } from "@/types";
import { Trash2, Share2 } from "lucide-react";

interface AdminProductTableProps {
  products: Product[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  handleShare: (product: Product) => void;
  handleEdit: (product: Product) => void;
  handleDelete: (id: string) => void;
  isLive: boolean;
}

export function AdminProductTable({
  products,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  handleShare,
  handleEdit,
  handleDelete,
  isLive,
}: AdminProductTableProps) {
  return (
    <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-medium border-b border-zinc-100 dark:border-zinc-800">
          <tr>
            <th className="px-6 py-4 w-[50px]">
              <input
                type="checkbox"
                checked={selectedIds.length === products.length && products.length > 0}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
  );
}
