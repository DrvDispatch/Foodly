import { Module } from '@nestjs/common';
import { MomentumService } from './momentum.service';
import { MomentumController } from './momentum.controller';

/**
 * Momentum Module
 * 
 * Behavioral momentum scoring:
 * - Level: strong | building | steady | starting
 * - Trend: up | stable | down
 * - Streak and weekly change
 */
@Module({
    providers: [MomentumService],
    controllers: [MomentumController],
    exports: [MomentumService],
})
export class MomentumModule { }
