export interface MedicationSummary {
  id: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
}
