import { UserEntity } from './user.entity';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';

export abstract class UserRepository {
  abstract findByPhone(phone: string): Promise<UserEntity | null>;

  abstract findById(id: string): Promise<UserEntity | null>;

  abstract findManyByPharmacy(pharmacyId: string): Promise<UserEntity[]>;

  abstract create(data: { phone: string; role: UserRole; status: UserStatus }): Promise<UserEntity>;

  abstract update(
    id: string,
    data: {
      fullName?: string;
      pharmacyId?: string;
      status?: UserStatus;
      role?: UserRole;
    },
  ): Promise<UserEntity>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
