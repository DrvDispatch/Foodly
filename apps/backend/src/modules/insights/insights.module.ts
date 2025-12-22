import { Module } from '@nestjs/common';
import { InsightsModuleService } from './insights-module.service';
import { InsightsController } from './insights.controller';
import { AiModule } from '../ai/ai.module';

/**
 * Insights Module
 * 
 * Handles AI-powered insights generation:
 * - Generate brief or detailed insights based on signals
 * - Cache insights per user
 */
@Module({
    imports: [AiModule],
    providers: [InsightsModuleService],
    controllers: [InsightsController],
    exports: [InsightsModuleService],
})
export class InsightsModule { }
