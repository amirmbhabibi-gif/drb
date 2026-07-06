import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import { FileStorage, StoredFile } from './file-storage.interface';

@Injectable()
export class SupabaseFileStorage implements FileStorage {
  private readonly client: SupabaseClient;
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

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
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

    const { error } = await this.client.storage.from(this.bucket).upload(objectKey, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      throw new Error(`UPLOAD_FAILED: ${error.message}`);
    }

    return {
      relativePath: objectKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  }

  async open(relativePath: string): Promise<Readable> {
    const { data, error } = await this.client.storage.from(this.bucket).download(relativePath);

    if (error || !data) {
      throw new Error('FILE_NOT_FOUND');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return Readable.from(buffer);
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
