import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

/**
 * Health Module
 * 
 * Micronutrient analysis:
 * - Weekly nutrient intake
 * - Deficiency detection
 * - AI-validated corrections
 */
@Module({
    providers: [HealthService],
    controllers: [HealthController],
    exports: [HealthService],
})
export class HealthModule { }
