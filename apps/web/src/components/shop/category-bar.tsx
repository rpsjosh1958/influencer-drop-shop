"use client";

import { Category } from "@/types";

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  bgColor: string;
  primaryColor: string;
}

export function CategoryBar({
  categories,
  selectedCategory,
  setSelectedCategory,
  bgColor,
  primaryColor,
}: CategoryBarProps) {
  if (categories.length === 0) return null;

  return (
    <section
      className="px-6 mb-8 max-w-7xl mx-auto sticky top-20 z-30 py-4 backdrop-blur-sm md:mx-auto overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: `${bgColor}F2` }}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 md:pb-0 px-6 md:px-0 md:justify-center">
        <button
          onClick={() => setSelectedCategory("All")}
          className="whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200"
          style={{
            backgroundColor:
              selectedCategory === "All" ? primaryColor : "transparent",
            color: selectedCategory === "All" ? bgColor : primaryColor,
            borderColor: primaryColor,
          }}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className="whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200"
            style={{
              backgroundColor:
                selectedCategory === cat.name
                  ? primaryColor
                  : "transparent",
              color: selectedCategory === cat.name ? bgColor : primaryColor,
              borderColor: primaryColor,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </section>
  );
}
