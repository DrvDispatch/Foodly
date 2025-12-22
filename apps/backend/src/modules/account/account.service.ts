import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountService {
    constructor(private prisma: PrismaService) { }

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
