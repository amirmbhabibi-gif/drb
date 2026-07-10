export class MedicationEntity {
  readonly id: string;
  readonly name: string;
  readonly genericName: string | null;
  readonly form: string | null;
  readonly strength: string | null;
  readonly atcCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: {
    id: string;
    name: string;
    genericName: string | null;
    form: string | null;
    strength: string | null;
    atcCode: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.genericName = props.genericName;
    this.form = props.form;
    this.strength = props.strength;
    this.atcCode = props.atcCode;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
