import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { StoreHydration } from "@/components/store-hydration";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/seo/site";
import { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_IMAGE } from "@/lib/seo/metadata";

/**
 * Inter, the one font of the site UI (400 text, 500/600 labels and buttons, 700 headings), served by
 * next/font from the site itself, with latin-ext for Ă Â Î Ș Ț.
 *
 * The sheets keep their own font: the canvas preview draws with "Nunito" (declared in globals.css and
 * fetched only by the pages that draw a sheet) and the PDFs embed their TTF copies.
 */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // No title template for now: /preturi/page.tsx writes „Prețuri · <brand>” in full and a template would
  // add the site name twice. Pages build their complete title with pageMetadata().
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["fișe de lucru pe programă", "fișe grădiniță", "fișe clasa I", "fișe clasa a II-a", "fișe clasa a III-a", "fișe clasa a IV-a", "planificare calendaristică", "fișe de lucru", "litere de trasat", "alfabetul românesc", "clasa pregătitoare", "exerciții grafice", "fișa cu numele copilului"],
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

export const viewport: Viewport = { themeColor: "#2448E8" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={inter.variable}>
      <body className="font-sans antialiased">
        <StoreHydration />
        <Analytics />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
