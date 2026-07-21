import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Name Clearance Assistant",
  description:
    "Wstępna ocena ryzyka użycia nazwy produktu/marki: znaki towarowe, patenty, firmy, domeny, web. Nie stanowi porady prawnej.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
