"use client";

import { Filter, Check } from "lucide-react";

interface FilterBarProps {
  filterType: "all" | "product" | "service";
  setFilterType: (type: "all" | "product" | "service") => void;
  priceRange: { min: string; max: string };
  setPriceRange: React.Dispatch<React.SetStateAction<{ min: string; max: string }>>;
  sortOrder: "asc" | "desc" | null;
  setSortOrder: (order: "asc" | "desc" | null) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  primaryColor: string;
}

export function FilterBar({
  filterType,
  setFilterType,
  priceRange,
  setPriceRange,
  sortOrder,
  setSortOrder,
  isFilterOpen,
  setIsFilterOpen,
  primaryColor,
}: FilterBarProps) {
  return (
    <section className="px-6 max-w-7xl mx-auto mt-2 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Mobile Toggle */}
      <div className="flex md:hidden">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold bg-white"
          style={{ borderColor: `${primaryColor}20`, color: primaryColor }}
        >
          <Filter size={14} />
          Filters & Sort
        </button>
      </div>

      {/* Filter Content */}
      <div
        className={`flex flex-col md:flex-row md:items-center gap-4 w-full ${isFilterOpen ? "flex" : "hidden md:flex"}`}
      >
        {/* Type Toggle */}
        <div className="flex bg-zinc-100 p-1 rounded-lg self-start">
          {(["all", "product", "service"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                filterType === t
                  ? "bg-white shadow text-black"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {t === "all"
                ? "All"
                : t === "product"
                  ? "Products"
                  : "Services"}
            </button>
          ))}
        </div>

        {/* Price Range */}
        <div className="flex items-center gap-2">
          <input
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) =>
              setPriceRange((p) => ({ ...p, min: e.target.value }))
            }
            className="w-20 px-3 py-1.5 rounded-lg border text-sm font-medium bg-white"
            style={{ borderColor: `${primaryColor}20` }}
            type="number"
          />
          <span className="text-zinc-300">-</span>
          <input
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) =>
              setPriceRange((p) => ({ ...p, max: e.target.value }))
            }
            className="w-20 px-3 py-1.5 rounded-lg border text-sm font-medium bg-white"
            style={{ borderColor: `${primaryColor}20` }}
            type="number"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 md:ml-auto">
          <div
            className="flex bg-white border rounded-lg overflow-hidden"
            style={{ borderColor: `${primaryColor}20` }}
          >
            <button
              onClick={() => setSortOrder("asc")}
              className={`px-3 py-2 flex items-center gap-1 hover:bg-zinc-50 ${sortOrder === "asc" ? "bg-zinc-50" : ""}`}
            >
              <span
                className="text-xs font-bold"
                style={{
                  color: sortOrder === "asc" ? primaryColor : "#a1a1aa",
                }}
              >
                Price Low
              </span>
              {sortOrder === "asc" && (
                <Check size={12} color={primaryColor} />
              )}
            </button>
            <div className="w-px bg-zinc-100" />
            <button
              onClick={() => setSortOrder("desc")}
              className={`px-3 py-2 flex items-center gap-1 hover:bg-zinc-50 ${sortOrder === "desc" ? "bg-zinc-50" : ""}`}
            >
              <span
                className="text-xs font-bold"
                style={{
                  color: sortOrder === "desc" ? primaryColor : "#a1a1aa",
                }}
              >
                Price High
              </span>
              {sortOrder === "desc" && (
                <Check size={12} color={primaryColor} />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
