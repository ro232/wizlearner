import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// latin-ext carries Ă Â Î Ș Ț.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
