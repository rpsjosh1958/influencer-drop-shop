import { ShopLayoutWrapper } from "@/components/shop/shop-layout-wrapper";
import { AlertProvider } from "@/context/alert-context";
import { StoreProvider } from "@/components/shop/store-provider";
import { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Props = {
  params: Promise<{ storeId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;

  try {
    const docRef = doc(db, "stores", storeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        title: `${data.name} | DROP.`,
        description: `Shop exclusive drops at ${data.name}.`,
      };
    }
  } catch (error) {
    console.error("Metadata fetch failed", error);
  }

  return {
    title: "Store | DROP.",
    description: "Exclusive drops.",
  };
}

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
