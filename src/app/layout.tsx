import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { StoreHydration } from "@/components/store-hydration";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/seo/site";
import { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE } from "@/lib/seo/metadata";

/**
 * Fonts, each downloaded once (latin + latin-ext in one variable file, so Ă Â Î Ș Ț are covered).
 *
 * Fraunces (headings): next/font, from src/app/fonts. The site uses 600 and 800; both come from
 * the same file.
 *
 * Nunito (text): declared once in globals.css under its real name, because the worksheet preview
 * draws on a canvas with the family "Nunito" and next/font would give it a generated name — which
 * is how it ended up downloaded twice. The file lives in /public/fonts next to the TTFs embedded
 * in the PDFs; it is preloaded here.
 */
const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-ext-wght.woff2", weight: "600", style: "normal" },
    { path: "./fonts/fraunces-latin-ext-wght.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const NUNITO_WOFF2 = "/fonts/nunito-v3602-latin-ext-wght.woff2";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // No title template for now: /preturi/page.tsx writes „Prețuri · WorksheetWiz” in full and a template would
  // add the site name twice. Pages build their complete title with pageMetadata().
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["fișe grădiniță", "fișe de lucru", "litere de trasat", "alfabetul românesc", "clasa pregătitoare", "exerciții grafice", "fișa cu numele copilului"],
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    type: "website",
    siteName: SITE_NAME,
    locale: "ro_RO",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, images: [OG_IMAGE.url] },
};

export const viewport: Viewport = { themeColor: "#1F2A44" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <head>
        <link rel="preload" href={NUNITO_WOFF2} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className={`${fraunces.variable} font-sans antialiased`}>
        <StoreHydration />
        <Analytics />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
