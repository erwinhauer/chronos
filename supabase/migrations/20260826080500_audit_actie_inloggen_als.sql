-- Nieuwe audit-actie voor de "inloggen als"-testfunctie: een beheerder die
-- inlogt als een andere gebruiker moet herleidbaar zijn via de bestaande,
-- append-only auditlog (§14.1) — geen los logmechanisme nodig.
alter type audit_actie add value 'inloggen_als';
