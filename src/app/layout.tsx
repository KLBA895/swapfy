import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SWAPFY – Exchange Value. Not Money.",
  description:
    "SWAPFY is a Swiss platform for fair item swapping. Exchange unused items directly with others.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "SWAPFY – Exchange Value. Not Money.",
    description:
      "Swap unused items with others in Switzerland. Simple, transparent and sustainable.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
