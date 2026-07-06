import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { FileStorage, StoredFile } from './file-storage.interface';

@Injectable()
export class SupabaseFileStorage implements FileStorage {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly bucket: string;
  private readonly licenseMaxBytes: number;
  private readonly allowedMime: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('storage.supabaseUrl');
    const serviceRoleKey = this.configService.get<string>('storage.supabaseServiceRoleKey');
    this.bucket = this.configService.get<string>('storage.supabaseBucket', 'licenses');
    this.licenseMaxBytes =
      this.configService.get<number>('upload.licenseMaxSizeMb', 5) * 1024 * 1024;
    const mimeList = this.configService.get<string[]>('upload.licenseAllowedMime', []);
    this.allowedMime = new Set(mimeList);

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase storage is not configured');
    }

    this.baseUrl = url.replace(/\/$/, '');
    this.apiKey = serviceRoleKey;
  }

  async saveLicense(file: Express.Multer.File): Promise<StoredFile> {
    if (!this.allowedMime.has(file.mimetype)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    if (file.size > this.licenseMaxBytes) {
      throw new Error('FILE_TOO_LARGE');
    }

    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const objectKey = `licenses/${randomUUID()}${ext}`;

    const response = await fetch(this.objectUrl(objectKey), {
      method: 'POST',
      headers: this.authHeaders(file.mimetype),
      body: Uint8Array.from(file.buffer),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`UPLOAD_FAILED: ${message}`);
    }

    return {
      relativePath: objectKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  async open(relativePath: string): Promise<Readable> {
    const response = await fetch(this.objectUrl(relativePath), {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      throw new Error('FILE_NOT_FOUND');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return Readable.from(buffer);
  }

  private objectUrl(objectKey: string): string {
    const encodedKey = objectKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.baseUrl}/storage/v1/object/${this.bucket}/${encodedKey}`;
  }

  private authHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      apikey: this.apiKey,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    return headers;
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
