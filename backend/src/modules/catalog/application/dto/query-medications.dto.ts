import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class QueryMedicationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by medication name or generic name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
