"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette } from "lucide-react";
export function StudioNav() {
  const pathname = usePathname();
  return (
    <header className="studio-nav">
      <Link href="/" className="studio-wordmark">
        <Palette size={21} aria-hidden />
        Artify
      </Link>
      <nav aria-label="Main">
        {[
          { href: "/", label: "Studio" },
          { href: "/preview", label: "Recorded runs" },
          { href: "/tarot", label: "Tarot archive" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
