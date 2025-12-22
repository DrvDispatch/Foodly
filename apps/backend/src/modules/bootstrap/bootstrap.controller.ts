import { Controller, Get, UseGuards } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

@Controller('bootstrap')
export class BootstrapController {
    constructor(private readonly bootstrapService: BootstrapService) { }

    /**
     * GET /api/bootstrap
     * Returns ALL core app data in ONE request
     * Handles both authenticated and unauthenticated users
     * 
     * Uses OptionalJwtAuthGuard so unauthenticated users get public bootstrap data
     * instead of a 401 error.
     */
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async getBootstrap(@CurrentUser() user: UserPayload | undefined) {
        // If no user (public request or invalid token), return minimal bootstrap
        if (!user) {
            return this.bootstrapService.getPublicBootstrap();
        }

        try {
            return await this.bootstrapService.getBootstrapData(user.id);
        } catch (error) {
            console.error('[API /bootstrap] Error:', error);
            return {
                error: 'Bootstrap failed',
                ready: false,
            };
        }
    }
}
