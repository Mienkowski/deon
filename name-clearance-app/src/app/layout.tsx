import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Name Clearance Assistant",
  description:
    "Wstępna ocena ryzyka użycia nazwy produktu/marki: znaki towarowe, patenty, firmy, domeny, web. Nie stanowi porady prawnej.",
};

const NAV = [
  { href: "/", label: "Badanie nazwy" },
  { href: "/podobienstwo", label: "Analiza podobieństwa" },
  { href: "/porownanie", label: "Porównanie nazw" },
  { href: "/zrodla", label: "Źródła danych" },
  { href: "/audyt", label: "Audyt" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <nav className="topnav no-print">
          <div className="topnav-inner">
            <a className="topnav-brand" href="/">NCA</a>
            <div className="topnav-links">
              {NAV.map((n) => (
                <a key={n.href} href={n.href}>{n.label}</a>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
