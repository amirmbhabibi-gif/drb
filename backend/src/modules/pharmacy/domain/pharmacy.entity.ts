import { PharmacyVerificationStatus } from './pharmacy-verification-status.enum';

export class PharmacyEntity {
  readonly id: string;
  readonly name: string;
  readonly licenseNumber: string | null;
  readonly verified: boolean;
  readonly verificationStatus: PharmacyVerificationStatus;
  readonly licenseDocumentPath: string | null;
  readonly licenseDocumentName: string | null;
  readonly licenseMimeType: string | null;
  readonly licenseSubmittedAt: Date | null;
  readonly rejectionReason: string | null;
  readonly reviewedAt: Date | null;
  readonly reviewedById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: {
    id: string;
    name: string;
    licenseNumber: string | null;
    verified: boolean;
    verificationStatus: PharmacyVerificationStatus;
    licenseDocumentPath: string | null;
    licenseDocumentName: string | null;
    licenseMimeType: string | null;
    licenseSubmittedAt: Date | null;
    rejectionReason: string | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.licenseNumber = props.licenseNumber;
    this.verified = props.verified;
    this.verificationStatus = props.verificationStatus;
    this.licenseDocumentPath = props.licenseDocumentPath;
    this.licenseDocumentName = props.licenseDocumentName;
    this.licenseMimeType = props.licenseMimeType;
    this.licenseSubmittedAt = props.licenseSubmittedAt;
    this.rejectionReason = props.rejectionReason;
    this.reviewedAt = props.reviewedAt;
    this.reviewedById = props.reviewedById;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
