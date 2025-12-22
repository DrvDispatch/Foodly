import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Health Controller
 * 
 * Endpoints:
 * - GET /api/health/weekly - Weekly micronutrient analysis
 */
@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get('weekly')
    async getWeeklyHealth(@CurrentUser() user: UserPayload) {
        return this.healthService.getWeeklyHealth(user.id);
    }
}
