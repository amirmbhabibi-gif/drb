import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

export interface StoredFile {
  relativePath: string;
  absolutePath: string;
  originalName: string;
  mimeType: string;
}

@Injectable()
export class LocalFileStorage {
  private readonly uploadDir: string;
  private readonly licenseMaxBytes: number;
  private readonly allowedMime: Set<string>;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.dir', './uploads');
    this.licenseMaxBytes =
      this.configService.get<number>('upload.licenseMaxSizeMb', 5) * 1024 * 1024;
    const mimeList = this.configService.get<string[]>('upload.licenseAllowedMime', []);
    this.allowedMime = new Set(mimeList);
    this.ensureDir(join(this.uploadDir, 'licenses'));
  }

  saveLicense(file: Express.Multer.File): StoredFile {
    if (!this.allowedMime.has(file.mimetype)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    if (file.size > this.licenseMaxBytes) {
      throw new Error('FILE_TOO_LARGE');
    }

    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const filename = `${randomUUID()}${ext}`;
    const relativePath = join('licenses', filename);
    const absolutePath = join(this.uploadDir, relativePath);

    writeFileSync(absolutePath, file.buffer);

    return {
      relativePath,
      absolutePath,
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  open(relativePath: string): Readable {
    const absolutePath = join(this.uploadDir, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error('FILE_NOT_FOUND');
    }
    return createReadStream(absolutePath);
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private extFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }
}
