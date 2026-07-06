import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FILE_STORAGE } from './file-storage.interface';
import { LocalFileStorage } from './local-file.storage';
import { SupabaseFileStorage } from './supabase-file.storage';

@Global()
@Module({
  providers: [
    LocalFileStorage,
    {
      provide: FILE_STORAGE,
      useFactory: (configService: ConfigService, local: LocalFileStorage) => {
        const driver = configService.get<'local' | 'supabase'>('storage.driver', 'local');
        if (driver === 'supabase') {
          return new SupabaseFileStorage(configService);
        }
        return local;
      },
      inject: [ConfigService, LocalFileStorage],
    },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
