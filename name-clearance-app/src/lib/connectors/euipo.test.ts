import { describe, it, expect } from "vitest";
import { mapEuipoResponse, mapEuipoStatus, isEuipoConfigured } from "./euipo";

describe("mapowanie EUIPO", () => {
  it("mapuje statusy EUIPO na LegalStatus", () => {
    expect(mapEuipoStatus("Registered")).toBe("registered");
    expect(mapEuipoStatus("Application filed")).toBe("applied");
    expect(mapEuipoStatus("Under examination")).toBe("applied");
    expect(mapEuipoStatus("Expired")).toBe("expired");
    expect(mapEuipoStatus("Cancelled")).toBe("invalidated");
    expect(mapEuipoStatus("Opposition pending")).toBe("opposed");
    expect(mapEuipoStatus("Coś nieznanego")).toBe("unknown");
  });

  it("mapuje odpowiedź z polem trademarks[] na rekordy korpusu", () => {
    const payload = {
      trademarks: [
        {
          applicationNumber: "018900001",
          wordMarkSpecification: { verbalElement: "Odznaka Plus" },
          applicants: [{ name: "EduCert S.A." }],
          niceClasses: [41, 9],
          status: "Registered",
          applicationDate: "2023-02-01",
          registrationDate: "2023-09-01",
          registrationOfficeCode: "EM",
        },
      ],
    };
    const recs = mapEuipoResponse(payload);
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe("Odznaka Plus");
    expect(recs[0].kind).toBe("trademark");
    expect(recs[0].owner).toBe("EduCert S.A.");
    expect(recs[0].legalStatus).toBe("registered");
    expect(recs[0].niceClasses).toEqual([41, 9]);
    expect(recs[0].externalId).toBe("018900001");
    expect(recs[0].link).toContain("018900001");
  });

  it("obsługuje pustą/niepoprawną odpowiedź bez wyjątku", () => {
    expect(mapEuipoResponse(null)).toEqual([]);
    expect(mapEuipoResponse({})).toEqual([]);
    expect(mapEuipoResponse({ content: [] })).toEqual([]);
    expect(mapEuipoResponse({ trademarks: [{ foo: "bar" }] })).toEqual([]);
  });

  it("pomija rekordy bez elementu słownego", () => {
    const recs = mapEuipoResponse({ trademarks: [{ applicationNumber: "1" }, { verbalElement: "OK" }] });
    expect(recs.length).toBe(1);
    expect(recs[0].name).toBe("OK");
  });

  it("nie jest skonfigurowane bez zmiennych środowiskowych", () => {
    const prevId = process.env.EUIPO_CLIENT_ID;
    const prevSecret = process.env.EUIPO_CLIENT_SECRET;
    delete process.env.EUIPO_CLIENT_ID;
    delete process.env.EUIPO_CLIENT_SECRET;
    expect(isEuipoConfigured()).toBe(false);
    if (prevId) process.env.EUIPO_CLIENT_ID = prevId;
    if (prevSecret) process.env.EUIPO_CLIENT_SECRET = prevSecret;
  });
});
