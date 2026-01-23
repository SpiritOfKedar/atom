import type { Metadata } from "next";
import { Alan_Sans } from "next/font/google";
import "./globals.css";

const alanSans = Alan_Sans({
  variable: "--font-alan-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Atom - AI Search",
  description: "An AI-powered search engine with real-time answers and source citations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${alanSans.variable} ${alanSans.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
