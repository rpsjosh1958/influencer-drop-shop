import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Roboto,
  Playfair_Display,
  Courier_Prime,
} from "next/font/google";
import DatadogInit from "../components/datadog-init";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const courier = Courier_Prime({
  variable: "--font-courier",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://copdrop.io"),
  alternates: {
    canonical: "./",
  },
  title: {
    default: "THE DROP | Own The Hype",
    template: "%s | THE DROP.", // Branding update
  },
  description:
    "The ultimate platform for creators and influencers to drop exclusive merch. Secure the bag with your own custom store.",
  keywords: [
    "ecommerce",
    "creator economy",
    "merch drops",
    "influencer store",
    "The Drop Shop", // Specific user request
    "sell online",
    "ghana ecommerce",
  ],
  authors: [{ name: "The Drop Team" }],
  openGraph: {
    title: "THE DROP | Own The Hype",
    description: "Launch your own store in seconds. The drop is yours.",
    url: "https://copdrop.io",
    siteName: "THE DROP.", // Branding update
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/landing/site-logo.png", // Updated path
        width: 1200,
        height: 630,
        alt: "The Drop.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "THE DROP | Own The Hype",
    description: "Launch your own store in seconds.",
    creator: "@copdrop_io",
  },
  icons: {
    icon: "/assets/landing/drop_logo.png",
    apple: "/assets/landing/drop_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${roboto.variable} ${playfair.variable} ${courier.variable} antialiased`}
      >
        <DatadogInit />
        {children}
      </body>
    </html>
  ); // Added closing parenthesis
}
