import { Controller, Get, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Progress Controller
 * 
 * Endpoints:
 * - GET /api/progress - Get XP and rank data
 */
@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
    constructor(private readonly progressService: ProgressService) { }

    @Get()
    async getProgress(@CurrentUser() user: UserPayload) {
        return this.progressService.getProgress(user.id);
    }
}
