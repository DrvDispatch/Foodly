import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InsightsModuleService } from './insights-module.service';
import { GenerateInsightDto, BatchGenerateInsightDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../../common/decorators';

/**
 * Insights Controller
 * 
 * Endpoints:
 * - POST /api/insights - Generate an AI insight
 * - POST /api/insights/batch - Generate insights for multiple meals at once
 */
@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
    constructor(private readonly insightsService: InsightsModuleService) { }

    /**
     * POST /api/insights
     * Generate an insight based on signal and context
     */
    @Post()
    async generateInsight(
        @CurrentUser() user: UserPayload,
        @Body() dto: GenerateInsightDto,
    ) {
        return this.insightsService.generateInsight(user.id, dto);
    }

    /**
     * POST /api/insights/batch
     * Generate insights for multiple meals in a single request
     * Significantly reduces API calls on home page (N meals → 1 request)
     */
    @Post('batch')
    async generateBatchInsights(
        @CurrentUser() user: UserPayload,
        @Body() dto: BatchGenerateInsightDto,
    ) {
        return this.insightsService.generateBatchInsights(user.id, dto);
    }
}
