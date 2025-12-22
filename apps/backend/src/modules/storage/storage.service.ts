import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

/**
 * Storage Service - MinIO S3-compatible object storage
 * 
 * Handles:
 * - Uploading files (base64 or buffer)
 * - Generating presigned URLs for downloads
 * - Deleting files
 * - Bucket initialization
 * 
 * Configuration via environment:
 * - MINIO_ENDPOINT: hostname (default: localhost)
 * - MINIO_PORT: port (default: 9000)
 * - MINIO_ACCESS_KEY: access key
 * - MINIO_SECRET_KEY: secret key
 * - MINIO_BUCKET: bucket name (default: nutri-uploads)
 * - MINIO_USE_SSL: use HTTPS (default: false)
 */
@Injectable()
export class StorageService implements OnModuleInit {
    private client: Minio.Client;
    private readonly bucketName: string;
    private readonly endpoint: string;
    private readonly port: number;
    private readonly useSSL: boolean;

    constructor(private configService: ConfigService) {
        this.endpoint = this.configService.get<string>('MINIO_ENDPOINT') || 'localhost';
        this.port = parseInt(this.configService.get<string>('MINIO_PORT') || '9000', 10);
        this.useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
        this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'nutri-uploads';

        this.client = new Minio.Client({
            endPoint: this.endpoint,
            port: this.port,
            useSSL: this.useSSL,
            accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
            secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
        });
    }

    /**
     * Initialize bucket on module startup
     */
    async onModuleInit() {
        try {
            const exists = await this.client.bucketExists(this.bucketName);
            if (!exists) {
                await this.client.makeBucket(this.bucketName);
                console.log(`[StorageService] Created bucket: ${this.bucketName}`);

                // Set bucket policy to allow public read access for images
                const publicPolicy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
                        },
                    ],
                };
                await this.client.setBucketPolicy(this.bucketName, JSON.stringify(publicPolicy));
                console.log(`[StorageService] Set public read policy on bucket`);
            } else {
                console.log(`[StorageService] Bucket exists: ${this.bucketName}`);
            }
        } catch (error) {
            console.error('[StorageService] Failed to initialize bucket:', error);
            // Don't throw - service can still work if bucket exists
        }
    }

    /**
     * Upload a file from base64 data
     * 
     * @param base64Data - Base64 encoded file data (with or without data URI prefix)
     * @param filename - Desired filename (will be prefixed with folder)
     * @param folder - Storage folder (e.g., 'meals', 'profiles')
     * @returns Object key (path in bucket)
     */
    async uploadBase64(base64Data: string, filename: string, folder: string = 'meals'): Promise<string> {
        // Strip data URI prefix if present
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        return this.uploadBuffer(buffer, filename, folder, this.detectMimeType(base64Data));
    }

    /**
     * Upload a file from buffer
     * 
     * @param buffer - File buffer
     * @param filename - Desired filename
     * @param folder - Storage folder
     * @param contentType - MIME type
     * @returns Object key (path in bucket)
     */
    async uploadBuffer(
        buffer: Buffer,
        filename: string,
        folder: string = 'meals',
        contentType: string = 'image/jpeg',
    ): Promise<string> {
        const key = `${folder}/${filename}`;

        await this.client.putObject(this.bucketName, key, buffer, buffer.length, {
            'Content-Type': contentType,
        });

        console.log(`[StorageService] Uploaded: ${key} (${buffer.length} bytes)`);
        return key;
    }

    /**
     * Get public URL for an object
     * Uses direct MinIO URL for public buckets
     */
    getPublicUrl(key: string): string {
        const protocol = this.useSSL ? 'https' : 'http';
        return `${protocol}://${this.endpoint}:${this.port}/${this.bucketName}/${key}`;
    }

    /**
     * Generate a presigned URL for temporary access
     * Useful for private buckets or time-limited access
     * 
     * @param key - Object key
     * @param expirySeconds - URL expiry time (default: 1 hour)
     */
    async getPresignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
        return this.client.presignedGetObject(this.bucketName, key, expirySeconds);
    }

    /**
     * Delete a file
     */
    async deleteFile(key: string): Promise<void> {
        try {
            await this.client.removeObject(this.bucketName, key);
            console.log(`[StorageService] Deleted: ${key}`);
        } catch (error) {
            console.error(`[StorageService] Failed to delete ${key}:`, error);
            throw error;
        }
    }

    /**
     * Delete multiple files
     */
    async deleteFiles(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        // Delete files one by one (more reliable than bulk delete)
        for (const key of keys) {
            try {
                await this.client.removeObject(this.bucketName, key);
            } catch (error) {
                console.error(`[StorageService] Failed to delete ${key}:`, error);
            }
        }
        console.log(`[StorageService] Deleted ${keys.length} files`);
    }

    /**
     * Check if a file exists
     */
    async fileExists(key: string): Promise<boolean> {
        try {
            await this.client.statObject(this.bucketName, key);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Detect MIME type from base64 data URI or magic bytes
     */
    private detectMimeType(base64String: string): string {
        // Check if it's a data URI with MIME type
        const dataUriMatch = base64String.match(/^data:(image\/\w+);base64,/);
        if (dataUriMatch) {
            return dataUriMatch[1];
        }

        // Try to detect from magic bytes
        const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');

        try {
            const bytes = Buffer.from(cleanBase64.substring(0, 16), 'base64');

            // PNG: 89 50 4E 47
            if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
                return 'image/png';
            }

            // JPEG: FF D8 FF
            if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
                return 'image/jpeg';
            }

            // WebP: RIFF....WEBP
            if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
                return 'image/webp';
            }

            // GIF: 47 49 46 38
            if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
                return 'image/gif';
            }
        } catch {
            // Fall back to jpeg if detection fails
        }

        return 'image/jpeg';
    }

    /**
     * Generate a unique filename for meal photos
     */
    generateMealPhotoFilename(userId: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${userId}-${timestamp}-${random}.jpg`;
    }

    /**
     * Extract object key from a full URL
     * Useful when you have a URL and need the key for deletion
     */
    extractKeyFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            // Remove leading slash and bucket name
            const path = urlObj.pathname;
            const bucketPrefix = `/${this.bucketName}/`;
            if (path.startsWith(bucketPrefix)) {
                return path.substring(bucketPrefix.length);
            }
            // Handle paths without bucket name (just the key)
            return path.startsWith('/') ? path.substring(1) : path;
        } catch {
            // Not a valid URL, might be just a key
            return url;
        }
    }
}
