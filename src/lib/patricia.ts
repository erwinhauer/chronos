import sql from "mssql";

// Read-only koppeling met de Patricia-database (SQL Server) van Knijff. Alleen
// bereikbaar vanaf het Knijff-netwerk/VPN — buiten dat netwerk (bv. een koude
// Vercel-functie zonder tunnel) faalt de connectie gewoon, en geven de
// onderstaande functies `null` terug in plaats van te gooien: het invullen van
// een factuuritem mag hier nooit op vastlopen, Patricia is een optioneel
// hulpmiddel, geen vereiste.
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
};

/**
 * Zoekt op Chronos' eigen dossiernummer (bv. "TM106410BX00") op in Patricia.
 * Geeft `null` terug als Patricia onbereikbaar is of het dossier niet bestaat
 * — nooit een fout die het formulier blokkeert.
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
          "SELECT TOP 1 a.NAME1 FROM CASTING c JOIN ACTOR a ON a.ACTOR_ID = c.ACTOR_ID WHERE c.CASE_ID = @id AND c.ROLE_TYPE_ID = 4 ORDER BY a.ACTOR_ID"
        ),
    ]);

    return {
      dossiernaam: (caseRow.recordset[0]?.CASE_CATCH_WORD as string | null) ?? null,
      klantNaam: (clientRow.recordset[0]?.NAME1 as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
