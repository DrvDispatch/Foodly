import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AccountService {
    constructor(
        private prisma: PrismaService,
        private storageService: StorageService,
    ) { }

    /**
     * Upload user avatar and update profile
     */
    async uploadAvatar(userId: string, imageBase64: string) {
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `avatar_${userId}_${timestamp}`;

        // Upload to MinIO storage
        const key = await this.storageService.uploadBase64(
            imageBase64,
            filename,
            'avatars', // Store in avatars folder
        );

        // Get the public URL
        const imageUrl = this.storageService.getPublicUrl(key);

        // Update user's image in database
        await this.prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl },
        });

        return { imageUrl };
    }

    /**
     * Delete user account and all associated data
     * Uses Prisma cascade deletion defined in schema
     */
    async deleteAccount(userId: string, confirmation: string) {
        // Require explicit confirmation
        if (confirmation !== 'DELETE MY ACCOUNT') {
            throw new BadRequestException('Confirmation phrase required');
        }

        // Delete user (cascades to all related data due to onDelete: Cascade)
        await this.prisma.user.delete({
            where: { id: userId },
        });

        return {
            success: true,
            message: 'Account deleted successfully',
        };
    }
}
