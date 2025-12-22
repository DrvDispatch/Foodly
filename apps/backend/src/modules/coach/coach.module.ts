import { Module } from '@nestjs/common';
import { CoachModuleService } from './coach-module.service';
import { CoachModuleController } from './coach-module.controller';
import { AiModule } from '../ai/ai.module';

/**
 * Coach Module
 * 
 * Handles AI coach conversations:
 * - Get/send messages
 * - Get daily reflections
 * - Track read state
 */
@Module({
    imports: [AiModule],
    providers: [CoachModuleService],
    controllers: [CoachModuleController],
    exports: [CoachModuleService],
})
export class CoachModule { }
