import { adminDb } from "@/lib/firebase-admin";
import ShopClient from "./shop-client";
import { Product, ServiceItem, Category } from "@/types";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const [productsSnap, servicesSnap, categoriesSnap] = await Promise.all([
    adminDb
      .collection("stores")
      .doc(storeId)
      .collection("products")
      .orderBy("createdAt", "desc")
      .get(),
    adminDb
      .collection("stores")
      .doc(storeId)
      .collection("services")
      .orderBy("createdAt", "desc")
      .get(),
    adminDb
      .collection("stores")
      .doc(storeId)
      .collection("categories")
      .orderBy("name", "asc")
      .get(),
  ]);

  const initialProducts = productsSnap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt:
        data.createdAt?.toMillis?.() ||
        data.createdAt?.seconds * 1000 ||
        Date.now(),
      ...(data.updatedAt && {
        updatedAt:
          data.updatedAt?.toMillis?.() ||
          data.updatedAt?.seconds * 1000 ||
          Date.now(),
      }),
    };
  }) as Product[];

  const initialServices = servicesSnap.docs
    .map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt:
          data.createdAt?.toMillis?.() ||
          data.createdAt?.seconds * 1000 ||
          Date.now(),
        ...(data.updatedAt && {
          updatedAt:
            data.updatedAt?.toMillis?.() ||
            data.updatedAt?.seconds * 1000 ||
            Date.now(),
        }),
      };
    })
    .filter((s: Record<string, any>) => s.isActive) as ServiceItem[];

  const initialCategories = categoriesSnap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt:
        data.createdAt?.toMillis?.() ||
        data.createdAt?.seconds * 1000 ||
        Date.now(),
      ...(data.updatedAt && {
        updatedAt:
          data.updatedAt?.toMillis?.() ||
          data.updatedAt?.seconds * 1000 ||
          Date.now(),
      }),
    };
  }) as Category[];

  return (
    <ShopClient
      storeId={storeId}
      initialProducts={initialProducts}
      initialServices={initialServices}
      initialCategories={initialCategories}
    />
  );
}
