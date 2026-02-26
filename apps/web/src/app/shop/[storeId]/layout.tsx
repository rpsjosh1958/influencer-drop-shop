import { cache } from "react";
import { ShopLayoutWrapper } from "@/components/shop/shop-layout-wrapper";
import { AlertProvider } from "@/context/alert-context";
import { StoreProvider } from "@/components/shop/store-provider";
import { Metadata } from "next";
import { adminDb } from "@/lib/firebase-admin";
import { StoreJsonLd } from "@/components/seo/json-ld";

type Props = {
  params: Promise<{ storeId: string }>;
};

// Deduplicate the store doc query across generateMetadata and layout body
const getStoreDoc = cache(async (storeId: string) => {
  try {
    const docSnap = await adminDb.collection("stores").doc(storeId).get();
    if (docSnap.exists) return docSnap.data() as Record<string, any>;
  } catch (error) {
    console.error("Failed to fetch store doc", error);
  }
  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;
  const data = await getStoreDoc(storeId);

  if (data) {
    return {
      title: `${data.name} | DROP.`,
      description: data.description || `Shop exclusive drops at ${data.name}.`,
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
  const data = await getStoreDoc(storeId);
  let storeJsonLd = null;

  if (data) {
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

  return (
    <StoreProvider>
      <AlertProvider>
        {storeJsonLd}
        <ShopLayoutWrapper>{children}</ShopLayoutWrapper>
      </AlertProvider>
    </StoreProvider>
  );
}
