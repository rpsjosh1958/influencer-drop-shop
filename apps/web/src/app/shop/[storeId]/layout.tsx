import { ShopLayoutWrapper } from "@/components/shop/shop-layout-wrapper";
import { AlertProvider } from "@/context/alert-context";
import { StoreProvider } from "@/components/shop/store-provider";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <AlertProvider>
        <ShopLayoutWrapper>{children}</ShopLayoutWrapper>
      </AlertProvider>
    </StoreProvider>
  );
}
