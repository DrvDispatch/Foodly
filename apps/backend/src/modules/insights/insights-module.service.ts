import { Injectable } from '@nestjs/common';
import { InsightService } from '../ai/insight.service';
import { GenerateInsightDto, BatchGenerateInsightDto } from './dto';

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

    /**
     * Generate insights for multiple meals in a single request
     * Processes in parallel for speed, with built-in caching
     */
    async generateBatchInsights(userId: string, dto: BatchGenerateInsightDto) {
        const { signals, userContext, level = 'brief' } = dto;

        // Process all signals in parallel (InsightService has caching)
        const results = await Promise.all(
            signals.map(async ({ id, signal }) => {
                try {
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

                    return { id, insight };
                } catch (error) {
                    console.error(`[InsightsService] Batch insight error for ${id}:`, error);
                    return { id, insight: null };
                }
            })
        );

        // Convert to map for easy frontend consumption
        const insights: Record<string, string | null> = {};
        results.forEach(({ id, insight }) => {
            insights[id] = insight;
        });

        return { insights };
    }
}
