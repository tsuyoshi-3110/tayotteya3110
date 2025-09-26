import { adminDb } from "@/lib/firebase-admin";

export default async function SitePage({ params: { siteKey } }: { params: { siteKey: string } }) {
  const snap = await adminDb.doc(`siteSettingsEditable/${siteKey}`).get();
  const s = snap.data() as any;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: s?.name,
    telephone: s?.phone,
    url: `https://www.pageit.example/${siteKey}`,
  };

  return (
    <main>
      {/* サイトのメインUI */}
      <h1>{s?.name}</h1>

      {/* このページだけJSON-LDを埋め込む */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
