import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Trends Controller
 * 
 * Endpoints:
 * - GET /api/trends - Get trend data for charting
 * - GET /api/trends/compare - Compare two time periods
 * - POST /api/trends/query - AI filter for trend queries
 * - POST /api/trends/explain - AI explanation of trend data
 * - POST /api/trends/weight-normalcy - AI context for weight fluctuations
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

    /**
     * POST /api/trends/query
     * AI filter for trend queries (convert natural language to structured filters)
     */
    @Post('query')
    async queryTrends(
        @CurrentUser() user: UserPayload,
        @Body() dto: { query: string; goals?: { calories?: number; protein?: number; carbs?: number; fat?: number } },
    ) {
        return this.trendsService.queryTrends(user.id, dto.query, dto.goals);
    }

    /**
     * POST /api/trends/explain
     * AI explanation of trend data
     */
    @Post('explain')
    async explainTrend(
        @CurrentUser() user: UserPayload,
        @Body() dto: { metric: string; range: string; stats: any; goal: number; dataPoints: any[] },
    ) {
        return this.trendsService.explainTrend(user.id, dto);
    }

    /**
     * POST /api/trends/weight-normalcy
     * AI context for weight fluctuations
     */
    @Post('weight-normalcy')
    async weightNormalcy(
        @CurrentUser() user: UserPayload,
        @Body() dto: { entries: any[]; direction: string; goalType?: string; targetWeight?: number; currentWeight?: number; weeklyPace?: number },
    ) {
        return this.trendsService.getWeightNormalcyMessage(dto);
    }

    /**
     * GET /api/trends/meal-breakdown
     * Get macro distribution by meal type (breakfast, lunch, dinner, snack)
     */
    @Get('meal-breakdown')
    async getMealBreakdown(
        @CurrentUser() user: UserPayload,
        @Query('range') range?: string,
    ) {
        return this.trendsService.getMealBreakdown(user.id, range);
    }

    /**
     * POST /api/trends/explain-source
     * AI explanation for meal source breakdown
     */
    @Post('explain-source')
    async explainSourceBreakdown(
        @CurrentUser() user: UserPayload,
        @Body() dto: {
            metric: string;
            breakdown: { breakfast: number; lunch: number; dinner: number; snack: number };
            total: number;
            goal: number;
            consistencyScore: number;
        },
    ) {
        return this.trendsService.explainSourceBreakdown(user.id, dto);
    }
}

