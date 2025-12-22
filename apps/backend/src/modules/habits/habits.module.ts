import { Module } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';

/**
 * Habits Module
 * 
 * Handles habit tracking and logging consistency:
 * - Active days, meal consistency
 * - Heatmap data
 * - AI-generated habit insights
 */
@Module({
    providers: [HabitsService],
    controllers: [HabitsController],
    exports: [HabitsService],
})
export class HabitsModule { }
