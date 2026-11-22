import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import { StudioNav } from "@/components/studio-nav";
import "./globals.css";
export const metadata: Metadata = {
  title: "Artify: an illustration workspace",
  description:
    "Explore palettes and scenes, compare generated illustrations with their source, and review every result before use.",
  icons: { icon: "/artify-icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body className="font-sans antialiased min-h-screen">
        <StudioNav />
        {children}
      </body>
    </html>
  );
}
