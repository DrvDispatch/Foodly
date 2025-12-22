import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

/**
 * Progress Module
 * 
 * XP-based progression system:
 * - Rank/tier progression
 * - Daily wins
 * - Streak tracking
 */
@Module({
    providers: [ProgressService],
    controllers: [ProgressController],
    exports: [ProgressService],
})
export class ProgressModule { }
