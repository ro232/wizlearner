import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WorksheetWiz — Premium Worksheet Generator for Kids",
  description: "Create customizable tracing worksheets, math sheets, word searches and more. Perfect for preschool and kindergarten. Print-ready PDF downloads.",
  keywords: ["worksheet generator", "tracing worksheets", "preschool", "kindergarten", "letter tracing", "number tracing", "educational worksheets"],
  openGraph: {
    title: "WorksheetWiz — Premium Worksheet Generator for Kids",
    description: "Create customizable tracing worksheets, math sheets, word searches and more.",
    type: "website",
    siteName: "WorksheetWiz",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
