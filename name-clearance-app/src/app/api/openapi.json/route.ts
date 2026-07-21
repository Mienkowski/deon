import { NextResponse } from "next/server";

// Minimalna specyfikacja OpenAPI (sekcja 15). Rozbudowa w Etapie 3.
const spec = {
  openapi: "3.0.3",
  info: {
    title: "Name Clearance Assistant API",
    version: "0.1.0",
    description:
      "API wstępnej oceny ryzyka użycia nazwy. Wynik nie jest gwarancją prawną.",
  },
  paths: {
    "/api/health": { get: { summary: "Status aplikacji", responses: { "200": { description: "OK" } } } },
    "/api/data-sources": { get: { summary: "Katalog źródeł danych", responses: { "200": { description: "OK" } } } },
    "/api/nice-classes/suggest": {
      post: {
        summary: "Sugestia klas nicejskich z opisu",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SuggestInput" } } } },
        responses: { "200": { description: "Lista propozycji" }, "400": { description: "Błąd walidacji" } },
      },
    },
    "/api/search-runs": {
      get: { summary: "Lista badań (historia)", responses: { "200": { description: "OK" } } },
      post: {
        summary: "Uruchomienie badania nazwy",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CandidateInput" } } } },
        responses: { "201": { description: "Utworzono" }, "400": { description: "Błąd walidacji" }, "429": { description: "Limit zapytań" } },
      },
    },
    "/api/similarity": {
      post: {
        summary: "Analiza podobieństwa nazwy do korpusu (sample | custom | epo)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, source: { type: "string", enum: ["sample", "custom", "euipo", "epo"] }, records: { type: "string", description: "surowy import (jedna nazwa/wiersz lub CSV)" }, minScore: { type: "number" } } } } } },
        responses: { "200": { description: "Ranking podobnych nazw z wyjaśnieniem" }, "400": { description: "Błąd walidacji" }, "503": { description: "EUIPO/EPO nieskonfigurowane" } },
      },
    },
    "/api/compare": {
      post: {
        summary: "Porównanie wielu nazw (2–10 kandydatów)",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["candidates"], properties: { candidates: { type: "array", items: { $ref: "#/components/schemas/CandidateInput" } } } } } } },
        responses: { "201": { description: "Wynik porównania z rekomendowaną kolejnością" }, "400": { description: "Błąd walidacji" }, "429": { description: "Limit zapytań" } },
      },
    },
    "/api/search-runs/{id}": { get: { summary: "Pełny wynik badania", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "404": { description: "Nie znaleziono" } } } },
    "/api/search-runs/{id}/status": { get: { summary: "Status badania i źródeł", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/search-runs/{id}/results": { get: { summary: "Wyniki i statusy źródeł", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/search-runs/{id}/risk": { get: { summary: "Ocena ryzyka i rekomendacje", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } } },
    "/api/reports/{id}/export": {
      post: {
        summary: "Eksport raportu (json|csv)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "query", schema: { type: "string", enum: ["json", "csv"] } },
        ],
        responses: { "200": { description: "Plik" }, "404": { description: "Nie znaleziono" } },
      },
    },
    "/api/audit-logs": { get: { summary: "Dziennik audytu", responses: { "200": { description: "OK" } } } },
  },
  components: {
    schemas: {
      SuggestInput: {
        type: "object",
        properties: { description: { type: "string" }, industry: { type: "string" }, goodsServices: { type: "string" } },
      },
      CandidateInput: {
        type: "object",
        required: ["name", "markType", "territories"],
        properties: {
          name: { type: "string" },
          markType: { type: "string" },
          description: { type: "string" },
          industry: { type: "string" },
          territories: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
