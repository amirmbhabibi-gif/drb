import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../../identity/domain/user-role.enum';

export class CreateStaffDto {
  @ApiProperty({ example: '09123456789', description: 'Iranian mobile number for staff login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string = '';

  @ApiProperty({ example: 'علی رضایی' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string = '';

  @ApiProperty({ enum: [UserRole.STAFF, UserRole.MANAGER], default: UserRole.STAFF })
  @IsEnum([UserRole.STAFF, UserRole.MANAGER])
  role: UserRole.STAFF | UserRole.MANAGER = UserRole.STAFF;
}

export class StaffResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() phone: string;
  @ApiPropertyOptional() fullName: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;

  constructor(props: {
    id: string;
    phone: string;
    fullName: string | null;
    role: UserRole;
    status: string;
    createdAt: Date;
  }) {
    this.id = props.id;
    this.phone = props.phone;
    this.fullName = props.fullName;
    this.role = props.role;
    this.status = props.status;
    this.createdAt = props.createdAt;
  }
}
