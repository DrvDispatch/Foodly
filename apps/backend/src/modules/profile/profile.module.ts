import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

/**
 * Profile Module
 * 
 * Handles user profile management:
 * - Get current user's profile
 * - Create/update profile (upsert)
 * - Auto-creates Goal record when targets are set
 */
@Module({
    providers: [ProfileService],
    controllers: [ProfileController],
    exports: [ProfileService],
})
export class ProfileModule { }
