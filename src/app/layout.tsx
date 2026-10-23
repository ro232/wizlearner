import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { StoreHydration } from "@/components/store-hydration";

// latin-ext carries Ă Â Î Ș Ț. Nunito is also the worksheet font, so screen and paper match.
const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-fraunces", weight: ["600", "800"], display: "swap" });

export const metadata: Metadata = {
  title: "WorksheetWiz — fișe de scris pentru grădiniță și clasa pregătitoare",
  description: "Fișe de trasat litere, cifre, forme și exerciții grafice, cu alfabetul românesc complet (Ă Â Î Ș Ț), ordinea liniilor și numele copilului. PDF gata de printat.",
  keywords: ["fișe grădiniță", "fișe de lucru", "litere de trasat", "alfabetul românesc", "clasa pregătitoare", "exerciții grafice", "fișa cu numele copilului"],
  openGraph: {
    title: "WorksheetWiz — fișe de scris gata într-un minut",
    description: "Litere, cifre și numele copilului de trasat, cu diacritice corecte. PDF gata de printat.",
    type: "website",
    siteName: "WorksheetWiz",
    locale: "ro_RO",
  },
};

export const viewport = { themeColor: "#1F2A44" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={`${nunito.variable} ${fraunces.variable} font-sans antialiased`}>
        <StoreHydration />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
