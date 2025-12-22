import { Injectable } from '@nestjs/common';
import { InsightService } from '../ai/insight.service';
import { GenerateInsightDto } from './dto';

/**
 * Insights Module Service
 * 
 * Wraps the AI InsightService for the REST API:
 * - Generate brief or detailed insights
 * - Handle caching via InsightService
 */
@Injectable()
export class InsightsModuleService {
    constructor(private insightService: InsightService) { }

    /**
     * Generate an insight based on signal and context
     */
    async generateInsight(userId: string, dto: GenerateInsightDto) {
        const { signal, userContext, level = 'brief' } = dto;

        // Call the AI insight service
        let insight: string | null;

        if (level === 'detailed') {
            insight = await this.insightService.generateDetailedInsightCached(
                signal,
                userContext,
                userId,
            );
        } else {
            insight = await this.insightService.generateInsightCached(
                signal,
                userContext,
                userId,
            );
        }

        if (!insight) {
            return { insight: null, fallback: true };
        }

        return { insight };
    }
}
