"use client";

import { Product, ServiceItem } from "@/types";
import { ProductCard } from "./product-card";
import { ServiceCard } from "./service-card";

interface ProductFeedProps {
  loading: boolean;
  filteredItems: any[];
  getGridClass: () => string;
  addToCart: (product: Product) => void;
  searchParams: any;
  storeId: string;
}

export function ProductFeed({
  loading,
  filteredItems,
  getGridClass,
  addToCart,
  searchParams,
  storeId,
}: ProductFeedProps) {
  return (
    <section className="px-4 mt-5 md:px-8 max-w-7xl mx-auto">
      {loading ? (
        <div className={`grid ${getGridClass()}`}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="aspect-4/5 bg-black/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className={`grid ${getGridClass()}`}>
          {filteredItems.map((item, i) =>
            item.type === "product" ? (
              <ProductCard
                key={item.id}
                product={item as Product}
                index={i}
                addToCart={addToCart}
                initialOpen={searchParams.get("productId") === item.id}
              />
            ) : (
              <ServiceCard
                key={item.id}
                service={item as ServiceItem}
                index={i}
                storeId={storeId}
              />
            ),
          )}
        </div>
      ) : (
        <div className="col-span-full py-20 text-center opacity-50">
          <p>No items found matching your filters.</p>
        </div>
      )}
    </section>
  );
}
