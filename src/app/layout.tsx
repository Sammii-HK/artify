import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Artify",
  description: "Turn pencil sketches into coloured illustrations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
