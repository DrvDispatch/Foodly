import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';

/**
 * Storage Module
 * 
 * Provides S3-compatible file storage using MinIO.
 * Used for:
 * - Meal photo uploads
 * - Any future file storage needs
 * 
 * Marked as @Global so it can be used by other modules without importing.
 */
@Global()
@Module({
    imports: [ConfigModule],
    providers: [StorageService],
    exports: [StorageService],
})
export class StorageModule { }
