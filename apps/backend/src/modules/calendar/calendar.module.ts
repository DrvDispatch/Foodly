import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

/**
 * Calendar Module
 * 
 * Handles calendar-related operations:
 * - Get month summary with day stats, patterns, and contexts
 * - Manage day contexts (tags like travel, training)
 * - Pattern detection (low protein, high carb, etc.)
 */
@Module({
    providers: [CalendarService],
    controllers: [CalendarController],
    exports: [CalendarService],
})
export class CalendarModule { }
