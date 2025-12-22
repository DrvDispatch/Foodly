import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Trends Controller
 * 
 * Endpoints:
 * - GET /api/trends - Get trend data for charting
 * - GET /api/trends/compare - Compare two time periods
 */
@Controller('trends')
@UseGuards(JwtAuthGuard)
export class TrendsController {
    constructor(private readonly trendsService: TrendsService) { }

    /**
     * GET /api/trends
     * Get aggregated trend data for a given range
     * Query params:
     * - range: '7d' | '30d' | '90d' | '180d'
     */
    @Get()
    async getTrends(
        @CurrentUser() user: UserPayload,
        @Query('range') range?: string,
    ) {
        return this.trendsService.getTrends(user.id, range);
    }

    /**
     * GET /api/trends/compare
     * Compare two time periods
     * Query params:
     * - preset: '14d' | '30d'
     */
    @Get('compare')
    async comparePeriods(
        @CurrentUser() user: UserPayload,
        @Query('preset') preset?: string,
    ) {
        return this.trendsService.comparePeriods(user.id, preset);
    }
}
