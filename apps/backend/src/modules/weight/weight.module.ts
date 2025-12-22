import { Module } from '@nestjs/common';
import { WeightService } from './weight.service';
import { WeightController } from './weight.controller';

/**
 * Weight Module
 * 
 * Handles weight tracking:
 * - List weight entries
 * - Add new weight entry (updates profile.currentWeight)
 * - Delete weight entry
 * - Get weight history
 */
@Module({
    providers: [WeightService],
    controllers: [WeightController],
    exports: [WeightService],
})
export class WeightModule { }
