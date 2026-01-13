"use client";

import React, { createContext, useContext, useState } from "react";

interface ShopUIContextType {
  // Order Details
  isOrderDetailsOpen: boolean;
  selectedOrderId: string | null;
  selectedStoreId: string | null;
  openOrderDetails: (orderId: string, storeId?: string) => void;
  closeOrderDetails: () => void;
  // Booking Details
  isBookingDetailsOpen: boolean;
  bookingDetailsId: string | null;
  bookingDetailsStoreId: string | null;
  openBookingDetails: (bookingId: string, storeId: string) => void;
  closeBookingDetails: () => void;
}

const ShopUIContext = createContext<ShopUIContextType | undefined>(undefined);

export function ShopUIProvider({ children }: { children: React.ReactNode }) {
  // Order state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // Booking state
  const [bookingDetailsId, setBookingDetailsId] = useState<string | null>(null);
  const [bookingDetailsStoreId, setBookingDetailsStoreId] = useState<
    string | null
  >(null);

  const openOrderDetails = (orderId: string, storeId?: string) => {
    setSelectedOrderId(orderId);
    if (storeId) setSelectedStoreId(storeId);
  };

  const closeOrderDetails = () => {
    setSelectedOrderId(null);
    setSelectedStoreId(null);
  };

  const openBookingDetails = (bookingId: string, storeId: string) => {
    setBookingDetailsId(bookingId);
    setBookingDetailsStoreId(storeId);
  };

  const closeBookingDetails = () => {
    setBookingDetailsId(null);
    setBookingDetailsStoreId(null);
  };

  return (
    <ShopUIContext.Provider
      value={{
        isOrderDetailsOpen: !!selectedOrderId,
        selectedOrderId,
        selectedStoreId,
        openOrderDetails,
        closeOrderDetails,
        isBookingDetailsOpen: !!bookingDetailsId,
        bookingDetailsId,
        bookingDetailsStoreId,
        openBookingDetails,
        closeBookingDetails,
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
