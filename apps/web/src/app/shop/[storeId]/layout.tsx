import { ShopLayoutWrapper } from "@/components/shop/shop-layout-wrapper";
import { AlertProvider } from "@/context/alert-context";
import { StoreProvider } from "@/components/shop/store-provider";
import { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StoreJsonLd } from "@/components/seo/json-ld";

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
        description:
          data.description || `Shop exclusive drops at ${data.name}.`,
        openGraph: {
          title: data.name,
          description:
            data.description || `Shop exclusive merchandise from ${data.name}.`,
          images: [
            {
              url: data.logoUrl || data.headerUrl || "/og-image.jpg",
              width: 800,
              height: 600,
              alt: data.name,
            },
          ],
        },
        alternates: {
          canonical: `https://copdrop.io/shop/${storeId}`,
        },
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

export default async function ShopLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}>) {
  const { storeId } = await params;
  let storeJsonLd = null;

  try {
    const docRef = doc(db, "stores", storeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      storeJsonLd = (
        <StoreJsonLd
          storeName={data.name}
          description={
            data.description || `Shop exclusive merchandise from ${data.name}.`
          }
          logoUrl={
            data.logoUrl || data.headerUrl || "https://copdrop.io/og-image.jpg"
          }
          url={`https://copdrop.io/shop/${storeId}`}
        />
      );
    }
  } catch (err) {
    console.error("Failed to fetch store for JSON-LD", err);
  }

  return (
    <StoreProvider>
      <AlertProvider>
        {storeJsonLd}
        <ShopLayoutWrapper>{children}</ShopLayoutWrapper>
      </AlertProvider>
    </StoreProvider>
  );
}
