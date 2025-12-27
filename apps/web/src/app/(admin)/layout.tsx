import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | DROP.",
  description: "Manage your store, products, and orders.",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
