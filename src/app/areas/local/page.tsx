// app/areas/local/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { seo, pageUrl } from "@/config/site";

// すべての固有情報は /config/site.ts に集約（areasLocal を利用）
export const metadata: Metadata = seo.page("areasLocal");

export default function AreasLocalPage() {
  // FAQ 構造化データ（株式会社 福源屋 用）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "夜間・早朝の美装工事や清掃は対応できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ビル・店舗の営業時間外や引渡し前の現場にも対応可能です。スケジュールに合わせて柔軟に調整しますのでご相談ください。",
        },
      },
      {
        "@type": "Question",
        name: "現場作業員の派遣は可能ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "はい、可能です。安全管理・服装・入退場ルールを順守のうえ、必要な人数・日程で手配いたします。",
        },
      },
      {
        "@type": "Question",
        name: "見積もりは無料ですか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "現地確認を含め無料でお見積もりいたします。現場の状況・面積・作業内容を確認のうえ最適なプランをご提案します。",
        },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          大阪・関西の美装工事・ビルメンテナンス（交野市拠点）
        </h1>
        <p className="text-sm text-muted-foreground">
          株式会社 福源屋は2002年創業。大阪府交野市を拠点に、関西一円（大阪市・枚方市・寝屋川市・京都府南部ほか）で
          美装工事・ビルメンテナンス・清掃・内装工事に対応します。
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border bg-white/70 p-5">
          <h2 className="font-semibold mb-2">美装工事・ビルメンテナンス</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>新築・改装現場の美装、引渡し前クリーニング</li>
            <li>定期・日常清掃（共用部・ガラス・外壁・床面）</li>
            <li>夜間・早朝作業、営業時間外の対応可</li>
          </ul>
        </article>
        <article className="rounded-xl border bg-white/70 p-5">
          <h2 className="font-semibold mb-2">清掃・内装工事・派遣</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>店舗・マンション・オフィスの各種清掃</li>
            <li>ハウスクリーニング／空室クリーニング</li>
            <li>内装工事一式、現場作業員派遣に対応</li>
          </ul>
        </article>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">対応エリア（関西一円）</h2>
        <p className="text-sm">
          大阪府交野市・大阪市・枚方市・寝屋川市・守口市・門真市・東大阪市・高槻市・茨木市・
          八尾市・堺市・和泉市・兵庫県阪神間・京都府南部 ほか
        </p>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">よくある質問</h2>
        <details className="mb-2">
          <summary className="cursor-pointer font-medium">
            急ぎの対応（当日・翌日）は可能ですか？
          </summary>
          <p className="text-sm mt-2">
            スケジュールに空きがあれば対応いたします。まずは現場所在地・ご希望日時・作業内容をお知らせください。
          </p>
        </details>
        <details>
          <summary className="cursor-pointer font-medium">
            鍵預かりや不在時の対応はできますか？
          </summary>
          <p className="text-sm mt-2">
            事前の取り決め（受け渡し・管理方法・返却手順）に基づき、適切に対応いたします。
          </p>
        </details>
      </section>

      <section className="rounded-xl border bg-white/70 p-5">
        <h2 className="font-semibold mb-2">お問い合わせ</h2>
        <p className="text-sm">
          お見積り・日程のご相談は、メールフォーム／お電話（サイト記載）にてお気軽にご連絡ください。現地確認も無料です。
        </p>
      </section>

      {/* 内部リンク（パスは config/site.ts の定義に合わせる） */}
      <nav className="text-sm underline">
        <Link href={pageUrl("/products")}>業務内容一覧へ</Link>
      </nav>

      {/* FAQ 構造化データ（XSS回避で < を無害化） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
