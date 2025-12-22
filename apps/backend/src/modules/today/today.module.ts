import { Module } from '@nestjs/common';
import { TodayService } from './today.service';
import { TodayController } from './today.controller';

/**
 * Today Module
 * 
 * Provides the unified Today Summary API:
 * - Profile & goals
 * - Meals with snapshots
 * - Daily nutrition summary
 * - Weight data
 * - Habits/streak info
 * - Coach unread state
 */
@Module({
    providers: [TodayService],
    controllers: [TodayController],
    exports: [TodayService],
})
export class TodayModule { }
