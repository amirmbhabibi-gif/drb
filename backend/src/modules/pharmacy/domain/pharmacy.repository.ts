import { PharmacyEntity } from './pharmacy.entity';
import { PharmacyVerificationStatus } from './pharmacy-verification-status.enum';

export abstract class PharmacyRepository {
  abstract findById(id: string): Promise<PharmacyEntity | null>;

  abstract findManyByStatus(status: PharmacyVerificationStatus): Promise<PharmacyEntity[]>;

  abstract findManyAll(): Promise<PharmacyEntity[]>;

  abstract create(data: {
    name: string;
    licenseNumber: string;
    licenseDocumentPath: string;
    licenseDocumentName: string;
    licenseMimeType: string;
  }): Promise<PharmacyEntity>;

  abstract updateLicenseSubmission(
    id: string,
    data: {
      name: string;
      licenseNumber: string;
      licenseDocumentPath: string;
      licenseDocumentName: string;
      licenseMimeType: string;
    },
  ): Promise<PharmacyEntity>;

  abstract markVerified(id: string, reviewedById: string): Promise<PharmacyEntity>;

  abstract markRejected(
    id: string,
    reviewedById: string,
    reason: string,
  ): Promise<PharmacyEntity>;
}

export const PHARMACY_REPOSITORY = Symbol('PHARMACY_REPOSITORY');
