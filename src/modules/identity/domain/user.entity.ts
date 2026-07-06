import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';

export class UserEntity {
  readonly id: string;
  readonly phone: string;
  readonly fullName: string | null;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly pharmacyId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: {
    id: string;
    phone: string;
    fullName: string | null;
    role: UserRole;
    status: UserStatus;
    pharmacyId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.phone = props.phone;
    this.fullName = props.fullName;
    this.role = props.role;
    this.status = props.status;
    this.pharmacyId = props.pharmacyId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  isSuspended(): boolean {
    return this.status === UserStatus.SUSPENDED;
  }
}
