import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Profile Controller
 * 
 * Endpoints:
 * - GET /api/profile - Get current user's profile
 * - POST /api/profile - Create or update profile
 * - PATCH /api/profile - Partial update profile (same as POST)
 */
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    /**
     * GET /api/profile
     * Get current user's profile
     */
    @Get()
    async getProfile(@CurrentUser() user: UserPayload) {
        return this.profileService.getProfile(user.id);
    }

    /**
     * POST /api/profile
     * Create or update profile (upsert)
     */
    @Post()
    async updateProfile(
        @CurrentUser() user: UserPayload,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profileService.upsertProfile(user.id, dto);
    }

    /**
     * PATCH /api/profile
     * Partial update profile (same logic as POST)
     */
    @Patch()
    async patchProfile(
        @CurrentUser() user: UserPayload,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profileService.upsertProfile(user.id, dto);
    }

    /**
     * GET /api/profile/goals
     * Get user's active macro targets
     */
    @Get('goals')
    async getGoals(@CurrentUser() user: UserPayload) {
        return this.profileService.getMacroTargets(user.id);
    }

    /**
     * POST /api/profile/explain
     * AI explanation of why targets are set as they are
     */
    @Post('explain')
    async explainTargets(@CurrentUser() user: UserPayload) {
        return this.profileService.explainTargets(user.id);
    }
}

