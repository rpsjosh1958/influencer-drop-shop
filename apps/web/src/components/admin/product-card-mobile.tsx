"use client";

import { Product } from "@/types";
import { Share2, Trash2 } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

interface AdminProductCardMobileProps {
  product: Product;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  handleShare: (product: Product) => void;
  handleEdit: (product: Product) => void;
  handleDelete: (id: string) => void;
  isLive: boolean;
}

export function AdminProductCardMobile({
  product,
  selectedIds,
  toggleSelect,
  handleShare,
  handleEdit,
  handleDelete,
  isLive,
}: AdminProductCardMobileProps) {
  const isSelected = selectedIds.includes(product.id);

  return (
    <div
      className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border transition-colors ${
        isSelected
          ? "border-black dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-800/30"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(product.id)}
          className="w-5 h-5 mt-1 rounded border-zinc-300 accent-black cursor-pointer flex-shrink-0"
        />

        <div className="h-16 w-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-base truncate pr-2">
              {product.name}
            </h3>
            <span className="font-mono text-sm font-bold">
              {formatCurrency(product.price)}
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

      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
        <Tooltip content="Share Product" side="top" className="flex-1">
          <button
            onClick={() => handleShare(product)}
            className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
          >
            <Share2 size={16} />
            Share
          </button>
        </Tooltip>

        <Tooltip
          content={isLive ? "Cannot edit while LIVE" : "Edit Item"}
          side="top"
          className="flex-1"
        >
          <button
            onClick={() => handleEdit(product)}
            disabled={isLive}
            className={`w-full py-2 flex items-center justify-center gap-2 text-sm font-medium rounded-lg ${
              isLive
                ? "text-zinc-300 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-900 cursor-not-allowed border border-zinc-100 dark:border-zinc-800"
                : "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
            }`}
          >
            {isLive ? "Locked" : "Edit"}
          </button>
        </Tooltip>

        <Tooltip content="Delete Product" side="top">
          <button
            onClick={() => handleDelete(product.id)}
            className="flex-none p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
