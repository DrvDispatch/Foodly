import { Module } from '@nestjs/common';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
import { AiModule } from '../ai/ai.module';

/**
 * Meals Module
 * 
 * Handles meal CRUD operations with AI analysis:
 * - Create meal with photo analysis (uses GeminiService)
 * - Upload photos to MinIO (uses StorageService)
 * - Get, update, delete meals
 * - Reanalyze meals
 */
@Module({
    imports: [AiModule],
    providers: [MealsService],
    controllers: [MealsController],
    exports: [MealsService],
})
export class MealsModule { }
