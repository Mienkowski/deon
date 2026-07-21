// Sugestia klas nicejskich na podstawie opisu (sekcja 4). Reguły słów
// kluczowych → klasa, z uzasadnieniem i poziomem pewności. Każda propozycja
// jest edytowalna przez użytkownika. Opcjonalna warstwa LLM w `llm.ts`.

import type { NiceClassSuggestion } from "@/lib/types";
import { stripPolishDiacritics } from "@/lib/similarity/phonetic";

interface NiceClassDef {
  classNumber: number;
  title: string;
  description: string;
  keywords: string[]; // znormalizowane (bez diakrytyków, lowercase)
}

// Wybrane, najczęściej trafiające klasy (pełny wykaz 1–45 w Etapie 3).
const NICE_CLASSES: NiceClassDef[] = [
  { classNumber: 9, title: "Oprogramowanie i sprzęt", description: "Oprogramowanie, aplikacje, sprzęt komputerowy, pliki do pobrania.",
    keywords: ["software", "oprogramowanie", "aplikacja", "app", "aplikacje", "platforma", "saas", "ai", "sztuczna inteligencja", "mobilna", "cyfrowe", "poswiadczenia", "credential"] },
  { classNumber: 35, title: "Reklama, zarządzanie, e-commerce", description: "Reklama, zarządzanie działalnością, sprzedaż, marketplace, sklep internetowy.",
    keywords: ["sklep", "ecommerce", "e-commerce", "marketplace", "reklama", "marketing", "sprzedaz", "handel", "biznes", "b2b", "b2c", "zarzadzanie"] },
  { classNumber: 41, title: "Nauczanie, szkolenia, certyfikacja", description: "Edukacja, szkolenia, kursy, certyfikacja cyfrowa, wydarzenia, rozrywka.",
    keywords: ["edukacja", "nauczanie", "szkolenie", "szkolenia", "kurs", "kursy", "certyfikacja", "certyfikat", "odznaka", "badge", "learning", "training", "education", "wydarzenie", "konferencja", "e-learning"] },
  { classNumber: 42, title: "Usługi IT, projektowanie, hosting", description: "Usługi naukowe i technologiczne, projektowanie i rozwój oprogramowania, hosting, SaaS.",
    keywords: ["saas", "hosting", "chmura", "cloud", "it", "technologia", "rozwoj", "projektowanie", "platforma", "api", "backend", "development", "oprogramowanie jako usluga", "cyfrowa certyfikacja"] },
  { classNumber: 36, title: "Finanse, ubezpieczenia", description: "Usługi finansowe, płatności, ubezpieczenia, nieruchomości.",
    keywords: ["finanse", "platnosci", "bank", "ubezpieczenia", "kredyt", "fintech", "nieruchomosci", "inwestycje"] },
  { classNumber: 44, title: "Usługi medyczne i pielęgnacyjne", description: "Usługi medyczne, weterynaryjne, higieniczne, kosmetyczne.",
    keywords: ["zdrowie", "medyczne", "klinika", "clinic", "kosmetyczne", "pielegnacja", "weterynaryjne", "dieta"] },
  { classNumber: 5, title: "Produkty farmaceutyczne", description: "Farmaceutyki, suplementy, wyroby medyczne, higiena.",
    keywords: ["farmaceutyczne", "lek", "suplement", "medyczny wyrob", "higiena"] },
  { classNumber: 25, title: "Odzież, obuwie", description: "Odzież, obuwie, nakrycia głowy.",
    keywords: ["odziez", "ubrania", "obuwie", "moda", "fashion", "koszulki"] },
  { classNumber: 30, title: "Żywność (kawa, pieczywo, słodycze)", description: "Kawa, herbata, pieczywo, słodycze, przyprawy.",
    keywords: ["kawa", "herbata", "pieczywo", "slodycze", "zywnosc", "przyprawy", "restauracja jedzenie"] },
  { classNumber: 43, title: "Usługi gastronomiczne, zakwaterowanie", description: "Restauracje, catering, hotele, zakwaterowanie.",
    keywords: ["restauracja", "gastronomia", "catering", "hotel", "kawiarnia", "zakwaterowanie"] },
  { classNumber: 38, title: "Telekomunikacja", description: "Telekomunikacja, przesyłanie danych, komunikatory.",
    keywords: ["telekomunikacja", "komunikator", "przesylanie danych", "streaming transmisja", "voip"] },
];

function normalize(s: string): string {
  return stripPolishDiacritics(s.toLowerCase());
}

/**
 * Reguły: dla każdego opisu/branży zliczamy trafienia słów kluczowych na klasę.
 * Pewność = f(liczby trafień). Zwraca posortowane propozycje (max `limit`).
 */
export function suggestNiceClasses(
  description: string,
  industry: string,
  goodsServices = "",
  limit = 5,
): NiceClassSuggestion[] {
  const haystack = normalize([description, industry, goodsServices].join(" "));
  const scored: { def: NiceClassDef; hits: string[] }[] = [];

  for (const def of NICE_CLASSES) {
    const hits = def.keywords.filter((k) => haystack.includes(k));
    if (hits.length > 0) scored.push({ def, hits });
  }

  scored.sort((a, b) => b.hits.length - a.hits.length);

  const suggestions: NiceClassSuggestion[] = scored.slice(0, limit).map(({ def, hits }) => {
    const confidence = Math.min(0.95, 0.4 + hits.length * 0.18);
    return {
      classNumber: def.classNumber,
      title: def.title,
      description: def.description,
      rationale: `Dopasowano słowa kluczowe: ${hits.slice(0, 5).join(", ")}.`,
      confidence: Number(confidence.toFixed(2)),
      selected: confidence >= 0.55,
      source: "rule",
    };
  });

  // Fallback, gdy nic nie trafiło — zaproponuj najczęstsze klasy usług cyfrowych
  // z niską pewnością i jawnym oznaczeniem.
  if (suggestions.length === 0) {
    for (const cn of [9, 35, 42]) {
      const def = NICE_CLASSES.find((d) => d.classNumber === cn)!;
      suggestions.push({
        classNumber: def.classNumber,
        title: def.title,
        description: def.description,
        rationale: "Brak jednoznacznych słów kluczowych — propozycja domyślna do weryfikacji.",
        confidence: 0.3,
        selected: false,
        source: "rule",
      });
    }
  }

  return suggestions;
}

export function allKnownNiceClasses(): NiceClassDef[] {
  return NICE_CLASSES;
}
