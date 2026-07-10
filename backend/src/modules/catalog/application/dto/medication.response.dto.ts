import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicationEntity } from '../../domain/medication.entity';

export class MedicationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() genericName: string | null;
  @ApiPropertyOptional() form: string | null;
  @ApiPropertyOptional() strength: string | null;
  @ApiPropertyOptional() atcCode: string | null;

  constructor(props: {
    id: string;
    name: string;
    genericName: string | null;
    form: string | null;
    strength: string | null;
    atcCode: string | null;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.genericName = props.genericName;
    this.form = props.form;
    this.strength = props.strength;
    this.atcCode = props.atcCode;
  }

  static fromEntity(entity: MedicationEntity): MedicationResponseDto {
    return new MedicationResponseDto({
      id: entity.id,
      name: entity.name,
      genericName: entity.genericName,
      form: entity.form,
      strength: entity.strength,
      atcCode: entity.atcCode,
    });
  }
}
