// Rekomendacje generowane przez system (sekcja 12). Proporcjonalne do jakości i
// kompletności danych oraz do poziomu ryzyka.

import type { NameCandidate, Recommendation, RiskAssessment, SourceResult } from "@/lib/types";

let seq = 0;
const rid = () => `rec_${(seq += 1)}`;

export function generateRecommendations(
  candidate: NameCandidate,
  risk: RiskAssessment,
  results: SourceResult[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const add = (text: string, priority: Recommendation["priority"]) =>
    recs.push({ id: rid(), text, priority });

  // Zawsze — badanie profesjonalne proporcjonalnie do ryzyka.
  if (risk.status === "C") {
    add("Skonsultuj wynik z rzecznikiem patentowym przed jakąkolwiek inwestycją w markę.", "important");
    add("Rozważ zmianę nazwy lub dodanie wyraźnie odróżniającego członu.", "important");
  } else if (risk.status === "B") {
    add("Przeprowadź badanie zdolności rejestrowej dla wskazanych klas i terytoriów.", "suggested");
    add("Zweryfikuj status konkretnych zgłoszeń o najwyższym podobieństwie.", "suggested");
  } else if (risk.status === "A") {
    add("Można rozważyć dalsze używanie nazwy po pełnym badaniu zdolności rejestrowej.", "suggested");
  }
  if (risk.status === "D") {
    add("Ponów badanie po przywróceniu dostępu do niedostępnych źródeł — wynik jest niekompletny.", "important");
  }

  // Domeny.
  const domains = results.filter((r) => r.kind === "domain");
  const takenPl = domains.find((d) => d.title.endsWith(".pl") && d.actualUse);
  if (takenPl) add("Kluczowe domeny (m.in. .pl) są zajęte — rozważ warianty lub inne rozszerzenia.", "suggested");
  add("Zabezpiecz dostępne domeny i nazwy profili w mediach społecznościowych.", "suggested");

  // Terytoria.
  if (candidate.territories.includes("WO")) {
    add("Dla zasięgu światowego rozszerz badanie o rejestry krajowe/regionalne (WIPO zaleca to wprost).", "suggested");
  } else if (candidate.territories.includes("EU")) {
    add("Rozważ badanie znaków krajowych państw docelowych UE poza bazą unijną.", "suggested");
  }

  // Klasy.
  add("Zweryfikuj dodatkowe, gospodarczo powiązane klasy nicejskie — różne klasy nie wykluczają konfliktu.", "info");

  // Rejestracja.
  if (risk.status !== "C") {
    add("Rozważ rejestrację znaku słownego oraz słowno-graficznego dla ochrony marki.", "info");
  }

  return recs;
}
