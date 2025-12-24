/**
 * Coach AI Service - Gemini-powered reflection and conversation
 * 
 * TONE RULES:
 * - Explanatory > persuasive
 * - Conditional > prescriptive
 * - Curious > corrective
 * 
 * SAFEGUARD:
 * - AI cannot introduce new advice that contradicts the automatic reflection
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PRIMARY_GOAL_LABELS } from './insights.util';

// ============================================================================
// TYPES
// ============================================================================

interface DaySummary {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface MealContext {
    description: string;
    nutrition: DaySummary | null;
}

interface ProfileContext {
    goalType?: string;
    targetCal?: number;
    proteinTarget?: number;
    dietaryPrefs?: string[];  // e.g., ['vegetarian', 'gluten_free']
}

export interface ReflectionInput {
    profile: ProfileContext | null;
    daySummary: DaySummary;
    meals: MealContext[];
    recentReflections: string[];
}

export interface ReplyInput {
    question: string;
    profile: ProfileContext | null;
    recentMessages: { role: string; content: string }[];
    daySummary: DaySummary;
    meals: string[];
}

/**
 * Coach Service - Daily reflections and conversational replies
 * 
 * Uses Gemini 3 Flash Preview for:
 * - Daily nutrition reflections (paragraph summaries)
 * - Conversational replies to user questions
 */
@Injectable()
export class CoachService {
    // NOTE: gemini-3-flash-preview was producing truncated/corrupted responses
    // Switched to gemini-2.0-flash which works correctly
    private readonly MODEL_NAME = 'gemini-2.0-flash';

    constructor(private configService: ConfigService) { }

    private getAI(): GoogleGenAI {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Generate daily reflection (paragraph summary)
     */
    async generateDailyReflection(input: ReflectionInput): Promise<string> {
        const { profile, daySummary, meals, recentReflections } = input;

        const goalLabel = profile?.goalType
            ? PRIMARY_GOAL_LABELS[profile.goalType as keyof typeof PRIMARY_GOAL_LABELS]?.label || profile.goalType
            : 'general health';

        const mealList = meals.map((m) => m.description).join(', ');

        // Calculate vs targets
        const calPct = profile?.targetCal
            ? Math.round((daySummary.calories / profile.targetCal) * 100)
            : null;
        const proteinPct = profile?.proteinTarget
            ? Math.round((daySummary.protein / profile.proteinTarget) * 100)
            : null;

        const prompt = `
You are a calm, reflective nutrition coach. Write a daily reflection paragraph for this user.

USER CONTEXT:
- Goal: ${goalLabel}
- Calorie target: ${profile?.targetCal || 'not set'}
- Protein target: ${profile?.proteinTarget || 'not set'}g

TODAY'S DATA:
- Meals: ${mealList || 'No meals logged'}
- Total: ${daySummary.calories} cal, ${Math.round(daySummary.protein)}g protein, ${Math.round(daySummary.carbs)}g carbs, ${Math.round(daySummary.fat)}g fat
${calPct ? `- Calorie progress: ${calPct}%` : ''}
${proteinPct ? `- Protein progress: ${proteinPct}%` : ''}

PREVIOUS REFLECTIONS (for context, avoid repetition):
${recentReflections.slice(0, 3).map((r, i) => `Day -${i + 1}: ${r.slice(0, 100)}...`).join('\n') || 'None'}

WRITING RULES:
- 3-5 sentences (paragraph format)
- Pattern-based observations, not data recitation
- Use conditional language ("if intentional", "may support")
- NO prescriptive commands ("you should", "you must")
- Educational, not preachy
- Acknowledge intent ambiguity where appropriate
- End with a supportive note

GOOD EXAMPLE:
"Today your meals leaned heavily toward carbohydrates, with protein intake lagging behind your muscle gain target. This pattern often works well as training fuel if you were intentionally eating around workouts. If not, increasing protein consistency across meals may better support muscle growth. Overall, your calorie intake was on track, which is a solid foundation to build on."

BAD EXAMPLE:
"You ate 5870 calories which is 161% of your goal. You should eat less and focus on protein." (too prescriptive, quotes numbers)

Respond with JSON: { "reflection": "your paragraph" }
`.trim();

        try {
            const ai = this.getAI();
            console.log('[CoachService] Generating reflection, calling Gemini...');

            // Define schema to force proper JSON output
            const reflectionSchema = {
                type: 'object',
                properties: {
                    reflection: { type: 'string', description: 'The daily reflection paragraph' },
                },
                required: ['reflection'],
            };

            const response = await ai.models.generateContent({
                model: this.MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: reflectionSchema,
                    temperature: 0.8,
                    maxOutputTokens: 300,
                },
            });

            const text = response.text?.trim();
            console.log('[CoachService] Gemini reflection response:', text?.substring(0, 200));
            if (!text) return 'Unable to generate reflection at this time.';

            // Try to extract JSON from the response
            let parsed: { reflection?: string } | null = null;

            try {
                parsed = JSON.parse(text);
            } catch {
                // Try to find JSON object in the text
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
                    try {
                        parsed = JSON.parse(jsonStr);
                        console.log('[CoachService] Extracted reflection JSON from position', jsonStart);
                    } catch (e) {
                        console.error('[CoachService] Failed to parse reflection JSON:', jsonStr.substring(0, 100));
                    }
                }
            }

            if (parsed?.reflection) {
                return parsed.reflection;
            }

            // Fallback - use text if reasonable
            const cleanText = text.replace(/^Here is the JSON[^:]*:\s*/i, '').trim();
            if (cleanText.length > 30 && cleanText.length < 600 && !cleanText.startsWith('{')) {
                return cleanText;
            }

            console.error('[CoachService] Could not extract reflection from:', text);
            return 'Unable to generate reflection at this time.';
        } catch (error) {
            console.error('[CoachService] Reflection error:', error);
            return 'Unable to generate reflection at this time.';
        }
    }

    /**
     * Generate conversational reply to user question
     */
    async generateCoachReply(input: ReplyInput): Promise<string> {
        const { question, profile, recentMessages, daySummary, meals } = input;

        const goalLabel = profile?.goalType
            ? PRIMARY_GOAL_LABELS[profile.goalType as keyof typeof PRIMARY_GOAL_LABELS]?.label || profile.goalType
            : 'general health';

        // Find today's reflection if any
        const todayReflection = recentMessages.find((m) => m.role === 'coach' && m.content.length > 100);

        const conversationHistory = recentMessages
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
            .join('\n');

        const prompt = `
You are a calm, informed nutrition coach having a conversation with a user.

USER CONTEXT:
- Goal: ${goalLabel}
- Targets: ${profile?.targetCal || '?'} cal, ${profile?.proteinTarget || '?'}g protein
- Dietary preferences: ${profile?.dietaryPrefs?.length ? profile.dietaryPrefs.join(', ') : 'None specified'}

TODAY'S DATA:
- Meals: ${meals.join(', ') || 'None logged'}
- Total: ${daySummary.calories} cal, ${Math.round(daySummary.protein)}g protein

${todayReflection ? `TODAY'S REFLECTION (you wrote this earlier, stay consistent):\n"${todayReflection.content}"` : ''}

CONVERSATION SO FAR:
${conversationHistory || 'No prior messages today'}

USER'S QUESTION:
"${question}"

RESPONSE RULES:
- 2-4 sentences
- Explanatory > persuasive
- Conditional > prescriptive
- If user provides context (e.g., "this was pre-workout"), incorporate it
- If referencing the reflection, quote or paraphrase it
- NEVER contradict the earlier reflection unless user explicitly asks for a different opinion
- Educational where appropriate
- No em dashes

GOOD EXAMPLE:
"That makes sense! Pre-workout carbs support training performance. For muscle gain overall, protein consistency matters more across the full day than any single meal."

BAD EXAMPLE:
"You should eat more protein." (too prescriptive, no context)

Respond with JSON: { "reply": "your response" }
`.trim();

        try {
            console.log('[CoachService] ========== GENERATING REPLY ==========');
            console.log('[CoachService] Question:', question);
            console.log('[CoachService] Profile:', JSON.stringify(profile));
            console.log('[CoachService] DaySummary:', JSON.stringify(daySummary));
            console.log('[CoachService] Meals:', meals);
            console.log('[CoachService] RecentMessages count:', recentMessages.length);
            console.log('[CoachService] Prompt length:', prompt.length);
            console.log('[CoachService] Prompt first 500 chars:', prompt.substring(0, 500));

            // Define schema to force proper JSON output
            const replySchema = {
                type: 'object',
                properties: {
                    reply: { type: 'string', description: 'The coach reply message' },
                },
                required: ['reply'],
            };

            const ai = this.getAI();
            const response = await ai.models.generateContent({
                model: this.MODEL_NAME,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: replySchema,
                    temperature: 1.0,
                    maxOutputTokens: 200,
                },
            });

            const text = response.text?.trim();
            console.log('[CoachService] ========== GEMINI RESPONSE ==========');
            console.log('[CoachService] Full response text:', text);
            console.log('[CoachService] Response length:', text?.length);
            if (!text) return "I'm having trouble responding right now. Please try again.";

            // Try to extract JSON from the response
            // Gemini sometimes prefixes JSON with "Here is the JSON requested:" etc.
            let parsed: { reply?: string } | null = null;

            // First, try direct parse
            try {
                parsed = JSON.parse(text);
            } catch {
                // Try to find JSON object in the text
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}');

                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
                    try {
                        parsed = JSON.parse(jsonStr);
                        console.log('[CoachService] Extracted JSON from position', jsonStart);
                    } catch (e) {
                        console.error('[CoachService] Failed to parse extracted JSON:', jsonStr.substring(0, 100));
                    }
                }
            }

            // If we got a valid reply, return it
            if (parsed?.reply) {
                return parsed.reply;
            }

            // Last resort: if Gemini returned plain text that looks like a response, use it
            // But filter out the "Here is the JSON" prefix
            const cleanText = text
                .replace(/^Here is the JSON[^:]*:\s*/i, '')
                .replace(/^\{[^}]*\}\s*/, '') // Remove any JSON at the start
                .trim();

            if (cleanText.length > 20 && cleanText.length < 500 && !cleanText.startsWith('{')) {
                return cleanText;
            }

            console.error('[CoachService] Could not extract reply from:', text);
            return "I'm having trouble responding right now. Please try again.";
        } catch (error) {
            console.error('[CoachService] Reply error:', error);
            return "I'm having trouble responding right now. Please try again.";
        }
    }
}
