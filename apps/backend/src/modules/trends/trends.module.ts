import { Module } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';

/**
 * Trends Module
 * 
 * Handles trend analysis and comparison:
 * - Get aggregated trend data for charting
 * - Compare two time periods
 * - Calculate statistics (mean, stdDev, trend direction)
 */
@Module({
    providers: [TrendsService],
    controllers: [TrendsController],
    exports: [TrendsService],
})
export class TrendsModule { }
