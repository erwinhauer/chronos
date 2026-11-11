export type TeamlidKpi = {
  naam: string;
  isTeamleider: boolean;
  urenAantal: number;
  urenBedrag: number;
  nietUrenBedrag: number;
  // Geen lid meer van dit team, maar heeft hier wel items gemaakt: die blijven op dit team staan.
  voorheen?: boolean;
};
