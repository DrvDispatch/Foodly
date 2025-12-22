import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { InsightService } from './insight.service';
import { CoachService } from './coach.service';

/**
 * AI Module
 * 
 * Central module for all AI-powered services:
 * - GeminiService: Meal analysis with image recognition
 * - InsightService: Goal-aware insights and suggestions
 * - CoachService: Daily reflections and conversational replies
 * 
 * All services use Google Gemini 3 Flash Preview model.
 */
@Module({
    imports: [ConfigModule],
    providers: [GeminiService, InsightService, CoachService],
    exports: [GeminiService, InsightService, CoachService],
})
export class AiModule { }
