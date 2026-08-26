// Cookienaam voor de "inloggen als"-testfunctie: zodra een beheerder inlogt als
// een andere gebruiker, staat hier de naam van de oorspronkelijke beheerder in,
// zodat de app-shell een banner kan tonen. De cookie is geen sessie-mechanisme
// (die loopt via Supabase's eigen auth-cookies) — puur UI-signalering.
export const IMPERSONATIE_COOKIE = "chronos_impersonatie_door";
