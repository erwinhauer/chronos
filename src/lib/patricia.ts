import sql from "mssql";

// Read-only koppeling met de Patricia-database (SQL Server) van Knijff. Alleen
// bereikbaar vanaf het Knijff-netwerk/VPN — buiten dat netwerk (bv. een koude
// Vercel-functie zonder tunnel) faalt de connectie gewoon, en geven de
// onderstaande functies `null` terug in plaats van te gooien.
//
// Sinds de dossiernummer/klant-verplichting (2026-09-04) is Patricia geen
// optioneel hulpmiddel meer maar een harde vereiste om een factuuritem aan te
// kunnen maken: een dossiernummer moet in Patricia bestaan, en de klant wordt
// uitsluitend via Patricia's Client-rol bepaald — "Chronos-klanten" bestaan
// niet los daarvan. Dat betekent dat Patricia bereikbaar moet zijn vanaf waar
// dit draait; zolang dat niet zo is (zie het netwerk-aandachtspunt hierboven)
// kan er hier geen factuuritem aangemaakt worden.
//
// Zie patricia_fields.md voor de volledige veldenlijst en het schema-onderzoek
// waar deze query's op gebaseerd zijn.

let poolPromise: Promise<sql.ConnectionPool> | null = null;

function config(): sql.config | null {
  const server = process.env.PATRICIA_DB_HOST;
  const domain = process.env.PATRICIA_DB_DOMAIN;
  const userName = process.env.PATRICIA_DB_USER;
  const password = process.env.PATRICIA_DB_PASSWORD;
  if (!server || !domain || !userName || !password) return null;

  return {
    server,
    port: Number(process.env.PATRICIA_DB_PORT ?? 1433),
    database: process.env.PATRICIA_DB_NAME ?? "Patricia",
    authentication: { type: "ntlm", options: { domain, userName, password } },
    options: { encrypt: true, trustServerCertificate: true, connectTimeout: 5000 },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
  };
}

async function getPool(): Promise<sql.ConnectionPool | null> {
  const cfg = config();
  if (!cfg) return null;
  if (!poolPromise) {
    poolPromise = sql.connect(cfg).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  try {
    return await poolPromise;
  } catch {
    return null;
  }
}

export type PatriciaDossierInfo = {
  dossiernaam: string | null;
  klantNaam: string | null;
  // Patricia's eigen ACTOR_ID voor de Client-rol op dit dossier — de
  // blijvende matching-sleutel voor `klanten.patricia_id` (betrouwbaarder dan
  // op naam matchen, die tussen Patricia en Chronos kan afwijken).
  klantActorId: string | null;
  // ADR1–5 samengevoegd met newlines, zelfde opmaak als `klanten.adres`.
  klantAdres: string | null;
};

/**
 * Zoekt op Chronos' eigen dossiernummer (bv. "TM106410BX00") op in Patricia.
 * Geeft `null` terug als Patricia onbereikbaar is of het dossier niet bestaat.
 * Sinds de dossiernummer-verplichting is dit geen "best effort" meer: de
 * aanroeper moet een `null` hier behandelen als "validatie mislukt", niet als
 * "sla dit veld gewoon over".
 */
export async function zoekDossierInfo(dossiernummer: string): Promise<PatriciaDossierInfo | null> {
  const pool = await getPool();
  if (!pool) return null;

  try {
    const caseResult = await pool
      .request()
      .input("nr", sql.NVarChar, dossiernummer)
      .query("SELECT CASE_ID FROM VW_CASE_NUMBER WHERE CASE_NUMBER = @nr");
    const caseId = caseResult.recordset[0]?.CASE_ID as number | undefined;
    if (!caseId) return null;

    const [caseRow, clientRow] = await Promise.all([
      pool
        .request()
        .input("id", sql.Int, caseId)
        .query("SELECT CASE_CATCH_WORD FROM PAT_CASE WHERE CASE_ID = @id"),
      pool
        .request()
        .input("id", sql.Int, caseId)
        .query(
          "SELECT TOP 1 a.ACTOR_ID, a.NAME1, a.ADR1, a.ADR2, a.ADR3, a.ADR4, a.ADR5 FROM CASTING c JOIN ACTOR a ON a.ACTOR_ID = c.ACTOR_ID WHERE c.CASE_ID = @id AND c.ROLE_TYPE_ID = 4 ORDER BY a.ACTOR_ID"
        ),
    ]);

    const client = clientRow.recordset[0] as
      | { ACTOR_ID: number; NAME1: string | null; ADR1: string | null; ADR2: string | null; ADR3: string | null; ADR4: string | null; ADR5: string | null }
      | undefined;
    const adresRegels = [client?.ADR1, client?.ADR2, client?.ADR3, client?.ADR4, client?.ADR5].filter(
      (r): r is string => Boolean(r && r.trim())
    );

    return {
      dossiernaam: (caseRow.recordset[0]?.CASE_CATCH_WORD as string | null) ?? null,
      klantNaam: client?.NAME1 ?? null,
      klantActorId: client ? String(client.ACTOR_ID) : null,
      klantAdres: adresRegels.length > 0 ? adresRegels.join("\n") : null,
    };
  } catch {
    return null;
  }
}
