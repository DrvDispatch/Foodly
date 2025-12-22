import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';

/**
 * Timeline Module
 * 
 * Provides daily meal timeline with:
 * - Running totals
 * - Macro bias per meal
 * - AI reflection
 */
@Module({
    providers: [TimelineService],
    controllers: [TimelineController],
    exports: [TimelineService],
})
export class TimelineModule { }
