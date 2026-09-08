-- Chronos — een factuuritem met een negatief bedrag toestaan (bv. om deels te
-- crediteren). Qty blijft een niet-negatief aantal (uren/stuks); de prijs
-- (tarief) mag voortaan ook negatief zijn, waarmee honorarium = qty * tarief
-- vanzelf negatief wordt. Dat brak op de bestaande korting-check
-- (korting <= honorarium): bij een negatief honorarium en de standaard
-- korting van 0 werd die altijd geschonden. Voor een negatief honorarium
-- (een credit) is een korting sowieso niet zinvol, dus die check geldt nu
-- alleen nog als het honorarium niet negatief is.

alter table public.factuuritems drop constraint factuuritems_korting_check;
alter table public.factuuritems add constraint factuuritems_korting_check
  check (honorarium < 0 or korting <= honorarium);
