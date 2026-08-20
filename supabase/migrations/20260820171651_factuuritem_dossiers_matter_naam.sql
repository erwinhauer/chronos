-- Chronos — de "merknaam" (Patricia's toekomstige "Catchword") van een dossier
-- meenemen op het moment dat een factuuritem wordt opgeslagen, zodat de
-- interne factuuritems-tabel dat kan tonen i.p.v. dienst/land (dat blijft
-- ongewijzigd opgeslagen voor de diensten-rapportage).

alter table public.factuuritem_dossiers add column matter_naam text;

comment on column public.factuuritem_dossiers.matter_naam is
  'Momentopname van patricia_dossiers.matter_naam op het moment van opslaan (toekomstige Patricia-term: "Catchword").';

update public.factuuritem_dossiers fd
set matter_naam = pd.matter_naam
from public.patricia_dossiers pd
where pd.dossiernummer = fd.dossiernummer;
