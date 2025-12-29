export function JsonLd({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function StoreJsonLd({
  storeName,
  description,
  logoUrl,
  url,
}: {
  storeName: string;
  description: string;
  logoUrl: string;
  url: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storeName,
    description: description,
    image: logoUrl,
    url: url,
    priceRange: "$$",
  };

  return <JsonLd data={jsonLd} />;
}
