"use client";

import React, { createContext, useContext, useState } from "react";

interface ShopUIContextType {
  isOrderDetailsOpen: boolean;
  selectedOrderId: string | null;
  selectedStoreId: string | null;
  openOrderDetails: (orderId: string, storeId?: string) => void;
  closeOrderDetails: () => void;
}

const ShopUIContext = createContext<ShopUIContextType | undefined>(undefined);

export function ShopUIProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const openOrderDetails = (orderId: string, storeId?: string) => {
    setSelectedOrderId(orderId);
    if (storeId) setSelectedStoreId(storeId);
  };

  const closeOrderDetails = () => {
    setSelectedOrderId(null);
    setSelectedStoreId(null);
  };

  return (
    <ShopUIContext.Provider
      value={{
        isOrderDetailsOpen: !!selectedOrderId,
        selectedOrderId,
        selectedStoreId,
        openOrderDetails,
        closeOrderDetails,
      }}
    >
      {children}
    </ShopUIContext.Provider>
  );
}

export function useShopUI() {
  const context = useContext(ShopUIContext);
  if (context === undefined) {
    throw new Error("useShopUI must be used within a ShopUIProvider");
  }
  return context;
}
