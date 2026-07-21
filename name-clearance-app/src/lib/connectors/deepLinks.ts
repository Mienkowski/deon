// Generatory legalnych, gotowych do ręcznego wykonania linków do oficjalnych
// wyszukiwarek (sekcja 17: "ręczne otwarcie przygotowanego zapytania").
// NIE pobieramy z nich danych automatycznie — dostarczamy audytowalne linki.

const enc = encodeURIComponent;

export interface DeepLinkSource {
  id: string;
  name: string;
  license: string;
  buildUrls: (name: string) => string[];
}

export const DEEP_LINK_SOURCES: DeepLinkSource[] = [
  {
    id: "uprp",
    name: "UPRP — Urząd Patentowy RP (e-Wyszukiwarka)",
    license: "Publiczna wyszukiwarka UPRP; korzystanie zgodnie z regulaminem urzędu.",
    buildUrls: (n) => [
      `https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search?query=${enc(n)}`,
    ],
  },
  {
    id: "euipo_tmview",
    name: "EUIPO — TMview",
    license: "TMview EUIPO; korzystanie zgodnie z warunkami serwisu.",
    buildUrls: (n) => [
      `https://www.tmdn.org/tmview/#/tmview/results?criteria=C&basicSearch=${enc(n)}`,
    ],
  },
  {
    id: "euipo_esearch",
    name: "EUIPO — eSearch plus",
    license: "EUIPO eSearch plus; korzystanie zgodnie z warunkami serwisu.",
    buildUrls: (n) => [`https://euipo.europa.eu/eSearch/#basic/${enc(n)}`],
  },
  {
    id: "tmclass",
    name: "EUIPO — TMclass (klasyfikacja towarów/usług)",
    license: "TMclass EUIPO.",
    buildUrls: (n) => [`https://euipo.europa.eu/ec2/search/find?text=${enc(n)}&lang=pl`],
  },
  {
    id: "designview",
    name: "EUIPO — DesignView (wzory)",
    license: "DesignView EUIPO.",
    buildUrls: (n) => [
      `https://www.tmdn.org/tmdsview-web/#/dsview/results?basicSearch=${enc(n)}`,
    ],
  },
  {
    id: "giview",
    name: "EUIPO — GIview (oznaczenia geograficzne)",
    license: "GIview EUIPO.",
    buildUrls: (n) => [`https://www.tmdn.org/giview/#/search?searchTerm=${enc(n)}`],
  },
  {
    id: "wipo_brand",
    name: "WIPO — Global Brand Database",
    license: "WIPO Global Brand Database; zaleca się także badanie rejestrów krajowych.",
    buildUrls: (n) => [`https://branddb.wipo.int/en/similarname/results?sort=score%20desc&rows=30&asStructure=%7B%22boolean%22:%22AND%22,%22bricks%22:%5B%7B%22key%22:%22brandName%22,%22value%22:%22${enc(n)}%22%7D%5D%7D`],
  },
  {
    id: "wipo_madrid",
    name: "WIPO — Madrid Monitor",
    license: "WIPO Madrid Monitor.",
    buildUrls: (n) => [`https://www3.wipo.int/madrid/monitor/en/#/results/brand/${enc(n)}`],
  },
  {
    id: "wipo_patentscope",
    name: "WIPO — PATENTSCOPE (pomocniczo)",
    license: "WIPO PATENTSCOPE — źródło pomocnicze (patenty).",
    buildUrls: (n) => [`https://patentscope.wipo.int/search/en/result.jsf?query=${enc(n)}`],
  },
  {
    id: "epo_espacenet",
    name: "EPO — Espacenet (pomocniczo)",
    license: "EPO Espacenet — źródło pomocnicze (patenty).",
    buildUrls: (n) => [`https://worldwide.espacenet.com/patent/search?q=${enc(n)}`],
  },
  {
    id: "epo_register",
    name: "EPO — European Patent Register (pomocniczo)",
    license: "EPO Register — źródło pomocnicze.",
    buildUrls: (n) => [`https://register.epo.org/espacenet/application?number=${enc(n)}`],
  },
  {
    id: "krs",
    name: "KRS — Krajowy Rejestr Sądowy",
    license: "Wyszukiwarka KRS (Ministerstwo Sprawiedliwości).",
    buildUrls: (n) => [`https://wyszukiwarka-krs.ms.gov.pl/?nazwa=${enc(n)}`],
  },
  {
    id: "ceidg",
    name: "CEIDG — Centralna Ewidencja i Informacja o Działalności Gospodarczej",
    license: "Wyszukiwarka CEIDG.",
    buildUrls: (n) => [`https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/Search.aspx?nazwa=${enc(n)}`],
  },
];

export interface SocialLinkSource {
  id: string;
  name: string;
  buildUrls: (handle: string) => string[];
}

/** Deep-linki do sprawdzenia nazw/profili w social mediach (ręcznie). */
export function socialMediaLinks(name: string): { id: string; name: string; url: string }[] {
  const h = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return [
    { id: "x", name: "X / Twitter", url: `https://x.com/${h}` },
    { id: "instagram", name: "Instagram", url: `https://www.instagram.com/${h}/` },
    { id: "facebook", name: "Facebook", url: `https://www.facebook.com/${h}` },
    { id: "linkedin", name: "LinkedIn (firmy)", url: `https://www.linkedin.com/company/${h}` },
    { id: "youtube", name: "YouTube", url: `https://www.youtube.com/@${h}` },
    { id: "tiktok", name: "TikTok", url: `https://www.tiktok.com/@${h}` },
    { id: "github", name: "GitHub", url: `https://github.com/${h}` },
  ];
}
