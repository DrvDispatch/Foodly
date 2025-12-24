/**
 * Gemini-Powered Insight Phrasing Service
 * 
 * DESIGN PRINCIPLES:
 * 1. BRIEF: 10-15 words max
 * 2. DETAILED: 2-3 sentences
 * 3. No em dashes, no quoting percentages back
 * 4. Actual insight, not data repetition
 * 5. Conditional framing
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import {
    InsightSignal,
    MealInsightSignal,
    DailyInsightSignal,
    WhatNextSignal,
    UserContext,
    PRIMARY_GOAL_LABELS,
} from './insights.util';

// ============================================================================
// TYPES
// ============================================================================

interface InsightResponse {
    insight: string;
}

type DetailLevel = 'brief' | 'detailed';

// Response schema for structured output
const insightResponseSchema = {
    type: 'object',
    properties: {
        insight: { type: 'string' },
    },
    required: ['insight'],
};

/**
 * Insight Service - Gemini-powered insight generation
 * 
 * Takes structured signals and generates human-readable insights
 * using Gemini 3 Flash Preview.
 */
@Injectable()
export class InsightService {
    private readonly MODEL_NAME = 'gemini-2.0-flash';
    private readonly insightCache = new Map<string, { text: string; timestamp: number }>();
    private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

    constructor(private configService: ConfigService) { }

    private getAI(): GoogleGenAI {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        return new GoogleGenAI({ apiKey });
    }

    // ============================================================================
    // PROMPT BUILDERS
    // ============================================================================

    private factsToString(facts: Record<string, boolean | number | undefined>): string {
        const activeFacts = Object.entries(facts)
            .filter(([, v]) => v !== undefined && v !== false)
            .map(([k, v]) => (typeof v === 'number' ? `${k}: ${v}` : k));
        return activeFacts.join(', ');
    }

    private buildMealPrompt(signal: MealInsightSignal, user: UserContext, level: DetailLevel): string {
        const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType;
        const dp = signal.dailyProgress;

        if (level === 'brief') {
            let avoidSuggesting = '';
            if (dp) {
                const metMacros: string[] = [];
                if (dp.proteinMet) metMacros.push('protein');
                if (dp.carbsMet) metMacros.push('carbs');
                if (dp.fatMet) metMacros.push('fat');
                if (metMacros.length > 0) {
                    avoidSuggesting = `DO NOT suggest more: ${metMacros.join(', ')} (already met for today).`;
                }
            }

            return `
You are a nutrition coach. Describe THIS MEAL briefly.

STRICT RULES:
- 10-15 words only
- NO em dashes
- Describe the meal's macro composition (high carb, protein-rich, balanced, etc.)
- DO NOT quote numbers or percentages
- DO NOT just say "goals already met" - describe the MEAL itself
${avoidSuggesting ? '- ' + avoidSuggesting : ''}

User goal: ${goalLabel}
Meal facts: ${this.factsToString(signal.facts)}

GOOD (describes the meal):
- "High carb meal. Good energy source for training."
- "Protein-rich and balanced. Supports muscle recovery."
- "Carb-forward with moderate fat. Solid fuel."

BAD:
- "Goals already hit, keep it up" ❌ (talks about daily status, not the meal)
- "Prioritize protein" when protein is already met ❌
- "This meal has 1100 calories" ❌ (quoting numbers)

Respond with JSON: { "insight": "your 10-15 word description of THIS meal" }
`.trim();
        }

        // Detailed level
        return `
You are a nutrition coach. Give a detailed meal insight (2-3 sentences).

STRICT RULES:
- Explain tradeoffs and context
- DO NOT quote percentages or exact numbers back
- Provide actionable insight, not data repetition
- Be supportive, acknowledge valid contexts
- Mention timing context (pre-workout, post-workout) if relevant

User goal: ${goalLabel}
Secondary focuses: ${user.secondaryFocuses.join(', ') || 'None'}
Meal facts: ${this.factsToString(signal.facts)}

GOOD example:
"This meal works well as pre-workout fuel since carbohydrates support training performance. For muscle gain, prioritize protein in your next meal to maintain synthesis throughout the day."

BAD examples (quoting data):
- "You've logged 30% of your calories..." ❌
- "Your protein intake is only at 13%..." ❌
- "This meal contains 1100 calories and 22g protein..." ❌

Respond with JSON: { "insight": "your 2-3 sentence insight" }
`.trim();
    }

    private buildDailyPrompt(signal: DailyInsightSignal, user: UserContext, level: DetailLevel): string {
        const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType;
        const facts = signal.facts;
        const mealsContext = signal.mealDescriptions?.length
            ? 'Today ate: ' + signal.mealDescriptions.join(', ')
            : '';

        if (level === 'brief') {
            // Special case: goals EXCEEDED significantly
            if (facts.allGoalsExceeded) {
                return `
You are a nutrition coach. The user has EXCEEDED ALL their daily goals. They are DONE eating.

STRICT RULES:
- 8-10 words only
- Pure celebration, NO suggestions to eat more
- DO NOT say "continue", "keep going", "focus on" - they are DONE!
- NO em dashes

GOOD examples:
- "All targets exceeded. Great day, you're set!"
- "Crushed it! All macros well above target."
- "Excellent intake today. Nothing more needed."

BAD:
- "Keep that momentum going..." ❌
- "Focus on nutrient-dense foods..." ❌

Respond with JSON: { "insight": "your 8-10 word pure celebration" }
`.trim();
            }

            // Special case: all goals met but not exceeded
            if (facts.allGoalsMet) {
                return `
You are a nutrition coach. The user has HIT ALL their daily goals.

STRICT RULES:
- 8-12 words only
- Celebrate briefly
- DO NOT say "continue" or "keep going" - they are done!
- NO em dashes

GOOD examples:
- "All targets hit. Solid day for muscle growth."
- "Goals complete. Well balanced intake today."
- "Done for the day. Great macro balance."

Respond with JSON: { "insight": "your 8-12 word celebration" }
`.trim();
            }

            // Build remaining macro context
            const remaining: string[] = [];
            if (facts.remainingProtein && facts.remainingProtein > 5)
                remaining.push('need ' + Math.round(facts.remainingProtein) + 'g protein');
            if (facts.remainingFat && facts.remainingFat > 5)
                remaining.push('need ' + Math.round(facts.remainingFat) + 'g fat');
            if (facts.remainingCarbs && facts.remainingCarbs > 10)
                remaining.push('need ' + Math.round(facts.remainingCarbs) + 'g carbs');

            return `
You are a nutrition coach. Give a brief daily progress note.

STRICT RULES:
- 10-15 words only
- NO em dashes
- DO NOT quote percentages
- If macros are remaining, give SPECIFIC food suggestion
- Keep it actionable

User goal: ${goalLabel}
Status: ${remaining.length > 0 ? remaining.join(', ') : 'On track'}
Met: ${facts.proteinMet ? 'protein done' : ''} ${facts.carbsMet ? 'carbs done' : ''} ${facts.fatMet ? 'fat done' : ''}

GOOD examples (with specific suggestions):
- "Protein hit. Add nuts or avocado for remaining fat."
- "Need protein - try Greek yogurt or chicken."
- "Carbs and fat done. Focus on lean protein now."

BAD:
- "Continue prioritizing protein and complex carbs" ❌ (too generic)
- "30% of calories consumed" ❌ (quoting numbers)

Respond with JSON: { "insight": "your 10-15 word note" }
`.trim();
        }

        // Detailed level - check exceeded first
        if (facts.allGoalsExceeded || facts.allGoalsMet) {
            return `
You are a nutrition coach. The user has ${facts.allGoalsExceeded ? 'EXCEEDED' : 'HIT'} all their daily goals.

STRICT RULES:
- 1-2 sentences ONLY (brief celebration)
- Acknowledge their success based on what they ate
- DO NOT suggest eating more - they are DONE!
- NO em dashes

User goal: ${goalLabel}
${mealsContext}

GOOD:
"Great day! You exceeded all your targets with a solid macro balance. Nothing more needed, just rest and recover."

BAD:
- "To keep that momentum going, focus on..." ❌ (stop suggesting!)
- "Continue prioritizing nutrient-dense foods..." ❌ (they are done!)

Respond with JSON: { "insight": "your 1-2 sentence celebration" }
`.trim();
        }

        // Detailed level - not all goals met
        return `
You are a nutrition coach. Give a detailed daily progress insight (2-3 sentences).

STRICT RULES:
- Explain what to focus on for remaining meals
- DO NOT quote specific percentages or numbers
- Give SPECIFIC food suggestions if macros are behind
- Be supportive and actionable

User goal: ${goalLabel}
Time: ${signal.day.hourOfDay}:00
Meals logged: ${signal.day.mealCount}
${mealsContext}
Facts: ${this.factsToString(signal.facts)}

GOOD example:
"Protein is behind your other macros right now. For your next meal, consider Greek yogurt, eggs, or chicken to catch up. Your carbs and fat intake are well balanced."

BAD examples:
- "You've logged 30% of your calorie goal..." ❌
- "Continue prioritizing protein..." ❌ (too generic)

Respond with JSON: { "insight": "your 2-3 sentence insight with specific suggestions" }
`.trim();
    }

    private buildWhatNextPrompt(signal: WhatNextSignal, user: UserContext): string {
        const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType;

        return `
You are a nutrition coach. Give a brief, gentle hint.

STRICT RULES:
- 8-10 words only
- NO em dashes
- DO NOT quote numbers
- Suggestion tone

User goal: ${goalLabel}
Facts: ${this.factsToString(signal.facts)}

GOOD:
- "Protein-forward dinner would round this out."
- "Close to target. Keep dinner light."
- "Focus on protein for your remaining meals."

Respond with JSON: { "insight": "your 8-10 word hint" }
`.trim();
    }

    // ============================================================================
    // GEMINI CALL
    // ============================================================================

    private async callGeminiForInsight(prompt: string, maxTokens: number): Promise<InsightResponse | null> {
        try {
            const ai = this.getAI();
            const response = await ai.models.generateContent({
                model: this.MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: insightResponseSchema,
                    temperature: 1.0, // Higher temp for creative phrasing
                    maxOutputTokens: maxTokens,
                },
            });

            const text = response.text?.trim();
            if (!text) return null;

            // Robust JSON parsing with fallback
            let parsed: InsightResponse;
            try {
                parsed = JSON.parse(text);
            } catch {
                // Try to extract JSON from mixed response
                const jsonMatch = text.match(/\{[\s\S]*"insight"[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[0]);
                    } catch {
                        console.warn('[InsightService] Could not extract JSON from response');
                        return null;
                    }
                } else {
                    // Use raw text as insight if it looks reasonable
                    if (text.length > 5 && text.length < 200) {
                        return { insight: text.replace(/["\n]/g, ' ').trim() };
                    }
                    console.warn('[InsightService] Non-JSON response received');
                    return null;
                }
            }

            // Remove em dashes if present
            if (parsed.insight) {
                parsed.insight = parsed.insight.replace(/—/g, ',').replace(/\s+/g, ' ').trim();
            }

            return parsed;
        } catch (error) {
            console.error('[InsightService] Error calling Gemini:', error);
            return null;
        }
    }


    // ============================================================================
    // PUBLIC API
    // ============================================================================

    async generateInsightText(signal: InsightSignal, userContext: UserContext): Promise<string | null> {
        return this.generateInsightWithLevel(signal, userContext, 'brief');
    }

    async generateMealInsight(
        signal: MealInsightSignal | null,
        userContext: UserContext,
    ): Promise<string | null> {
        if (!signal) return null;
        return this.generateInsightWithLevel(signal, userContext, 'brief');
    }

    async generateDailyInsight(
        signal: DailyInsightSignal,
        userContext: UserContext,
    ): Promise<string | null> {
        return this.generateInsightWithLevel(signal, userContext, 'brief');
    }

    async generateWhatNextHint(
        signal: WhatNextSignal | null,
        userContext: UserContext,
    ): Promise<string | null> {
        if (!signal) return null;
        const prompt = this.buildWhatNextPrompt(signal, userContext);
        const response = await this.callGeminiForInsight(prompt, 40);
        return response?.insight || null;
    }

    async generateDetailedMealInsight(
        signal: MealInsightSignal | null,
        userContext: UserContext,
    ): Promise<string | null> {
        if (!signal) return null;
        return this.generateInsightWithLevel(signal, userContext, 'detailed');
    }

    async generateDetailedDailyInsight(
        signal: DailyInsightSignal,
        userContext: UserContext,
    ): Promise<string | null> {
        return this.generateInsightWithLevel(signal, userContext, 'detailed');
    }

    private async generateInsightWithLevel(
        signal: InsightSignal,
        userContext: UserContext,
        level: DetailLevel,
    ): Promise<string | null> {
        let prompt: string;
        const maxTokens = level === 'brief' ? 60 : 150;

        switch (signal.type) {
            case 'meal':
                prompt = this.buildMealPrompt(signal, userContext, level);
                break;
            case 'daily':
                prompt = this.buildDailyPrompt(signal, userContext, level);
                break;
            case 'whatnext':
                prompt = this.buildWhatNextPrompt(signal, userContext);
                break;
            default:
                return null;
        }

        const response = await this.callGeminiForInsight(prompt, maxTokens);
        return response?.insight || null;
    }

    // ============================================================================
    // CACHING
    // ============================================================================

    private getCacheKey(signal: InsightSignal, userId?: string, level: DetailLevel = 'brief'): string {
        return `${signal.type}:${level}:${userId || 'anon'}:${JSON.stringify(signal.facts)}`;
    }

    async generateInsightCached(
        signal: InsightSignal,
        userContext: UserContext,
        userId?: string,
    ): Promise<string | null> {
        const key = this.getCacheKey(signal, userId, 'brief');
        const cached = this.insightCache.get(key);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.text;
        }

        const text = await this.generateInsightText(signal, userContext);
        if (text) {
            this.insightCache.set(key, { text, timestamp: Date.now() });
        }
        return text;
    }

    async generateDetailedInsightCached(
        signal: InsightSignal,
        userContext: UserContext,
        userId?: string,
    ): Promise<string | null> {
        const key = this.getCacheKey(signal, userId, 'detailed');
        const cached = this.insightCache.get(key);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.text;
        }

        let text: string | null = null;
        if (signal.type === 'meal') {
            text = await this.generateDetailedMealInsight(signal, userContext);
        } else if (signal.type === 'daily') {
            text = await this.generateDetailedDailyInsight(signal, userContext);
        }

        if (text) {
            this.insightCache.set(key, { text, timestamp: Date.now() });
        }
        return text;
    }
}
