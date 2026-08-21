// Voorbeeldscherm-chrome rond de factuur/specificatie-inhoud (zelf ongewijzigd
// t.o.v. het echte document) — een licht getinte buitenrand met daarin een
// losstaande witte kaart, zodat het duidelijk als "voorbeeld" leest.
export function FactuurVoorbeeldKaart({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/30 p-4 print:bg-transparent print:p-0 sm:p-6">
      <div className="overflow-x-auto rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border print:shadow-none print:ring-0 sm:p-8">
        {children}
      </div>
    </div>
  );
}
