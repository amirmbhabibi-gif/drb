import { Readable } from 'stream';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface StoredFile {
  relativePath: string;
  originalName: string;
  mimeType: string;
}

export interface FileStorage {
  saveLicense(file: Express.Multer.File): Promise<StoredFile>;
  open(relativePath: string): Promise<Readable>;
}
