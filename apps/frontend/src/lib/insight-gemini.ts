/**
 * Gemini-Powered Insight Phrasing
 * 
 * DESIGN PRINCIPLES:
 * 1. BRIEF: 10-15 words max
 * 2. DETAILED: 2-3 sentences
 * 3. No em dashes, no quoting percentages back
 * 4. Actual insight, not data repetition
 * 5. Conditional framing
 */

import { GoogleGenAI } from '@google/genai'
import {
    InsightSignal,
    MealInsightSignal,
    DailyInsightSignal,
    WhatNextSignal,
    UserContext,
    PRIMARY_GOAL_LABELS,
} from './insights'

// ============================================================================
// TYPES
// ============================================================================

interface InsightResponse {
    insight: string
}

type DetailLevel = 'brief' | 'detailed'

// ============================================================================
// GEMINI CLIENT
// ============================================================================

function getAI() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function factsToString(facts: Record<string, boolean | number | undefined>): string {
    const activeFacts = Object.entries(facts)
        .filter(([, v]) => v !== undefined && v !== false)
        .map(([k, v]) => (typeof v === 'number' ? `${k}: ${v}` : k))
    return activeFacts.join(', ')
}

function buildMealPrompt(signal: MealInsightSignal, user: UserContext, level: DetailLevel): string {
    const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType
    const dp = signal.dailyProgress

    // Build daily context string
    let dailyContext = ''
    if (dp) {
        if (dp.allGoalsExceeded || dp.allGoalsMet) {
            dailyContext = 'IMPORTANT: All daily goals already hit. Do NOT suggest eating more.'
        } else {
            const metMacros: string[] = []
            const needMacros: string[] = []
            if (dp.proteinMet) metMacros.push('protein')
            else needMacros.push('protein')
            if (dp.carbsMet) metMacros.push('carbs')
            else needMacros.push('carbs')
            if (dp.fatMet) metMacros.push('fat')
            else needMacros.push('fat')

            if (metMacros.length > 0) dailyContext += `Already met for today: ${metMacros.join(', ')}. `
            if (needMacros.length > 0) dailyContext += `Still need: ${needMacros.join(', ')}.`
        }
    }

    if (level === 'brief') {
        // Build context-aware constraint
        let avoidSuggesting = ''
        if (dp) {
            const metMacros: string[] = []
            if (dp.proteinMet) metMacros.push('protein')
            if (dp.carbsMet) metMacros.push('carbs')
            if (dp.fatMet) metMacros.push('fat')
            if (metMacros.length > 0) {
                avoidSuggesting = `DO NOT suggest more: ${metMacros.join(', ')} (already met for today).`
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
Meal facts: ${factsToString(signal.facts)}

GOOD (describes the meal):
- "High carb meal. Good energy source for training."
- "Protein-rich and balanced. Supports muscle recovery."
- "Carb-forward with moderate fat. Solid fuel."

BAD:
- "Goals already hit, keep it up" ❌ (talks about daily status, not the meal)
- "Prioritize protein" when protein is already met ❌
- "This meal has 1100 calories" ❌ (quoting numbers)

Respond with JSON: { "insight": "your 10-15 word description of THIS meal" }
`.trim()
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
Meal facts: ${factsToString(signal.facts)}

GOOD example:
"This meal works well as pre-workout fuel since carbohydrates support training performance. For muscle gain, prioritize protein in your next meal to maintain synthesis throughout the day."

BAD examples (quoting data):
- "You've logged 30% of your calories..." ❌
- "Your protein intake is only at 13%..." ❌
- "This meal contains 1100 calories and 22g protein..." ❌

Respond with JSON: { "insight": "your 2-3 sentence insight" }
`.trim()
}

function buildDailyPrompt(signal: DailyInsightSignal, user: UserContext, level: DetailLevel): string {
    const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType
    const facts = signal.facts
    const mealsContext = signal.mealDescriptions?.length
        ? 'Today ate: ' + signal.mealDescriptions.join(', ')
        : ''

    if (level === 'brief') {
        // Special case: goals EXCEEDED significantly (don't suggest anything)
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
`.trim()
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
`.trim()
        }

        // Build remaining macro context
        const remaining: string[] = []
        if (facts.remainingProtein && facts.remainingProtein > 5) remaining.push('need ' + Math.round(facts.remainingProtein) + 'g protein')
        if (facts.remainingFat && facts.remainingFat > 5) remaining.push('need ' + Math.round(facts.remainingFat) + 'g fat')
        if (facts.remainingCarbs && facts.remainingCarbs > 10) remaining.push('need ' + Math.round(facts.remainingCarbs) + 'g carbs')

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
`.trim()
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
`.trim()
    }

    // Detailed level - not all goals met, provide guidance
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
Facts: ${factsToString(signal.facts)}

GOOD example:
"Protein is behind your other macros right now. For your next meal, consider Greek yogurt, eggs, or chicken to catch up. Your carbs and fat intake are well balanced."

BAD examples:
- "You've logged 30% of your calorie goal..." ❌
- "Continue prioritizing protein..." ❌ (too generic)

Respond with JSON: { "insight": "your 2-3 sentence insight with specific suggestions" }
`.trim()
}

function buildWhatNextPrompt(signal: WhatNextSignal, user: UserContext): string {
    const goalLabel = PRIMARY_GOAL_LABELS[user.goalType]?.label || user.goalType

    return `
You are a nutrition coach. Give a brief, gentle hint.

STRICT RULES:
- 8-10 words only
- NO em dashes
- DO NOT quote numbers
- Suggestion tone

User goal: ${goalLabel}
Facts: ${factsToString(signal.facts)}

GOOD:
- "Protein-forward dinner would round this out."
- "Close to target. Keep dinner light."
- "Focus on protein for your remaining meals."

Respond with JSON: { "insight": "your 8-10 word hint" }
`.trim()
}

// ============================================================================
// GEMINI CALL
// ============================================================================

const insightResponseSchema = {
    type: 'object',
    properties: {
        insight: { type: 'string' },
    },
    required: ['insight'],
}

async function callGeminiForInsight(prompt: string, maxTokens: number): Promise<InsightResponse | null> {
    try {
        const ai = getAI()
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: insightResponseSchema,
                temperature: 1.0, // Higher temp for creative phrasing
                maxOutputTokens: maxTokens,
            },
        })

        const text = response.text?.trim()
        if (!text) return null

        const parsed = JSON.parse(text) as InsightResponse

        // Remove em dashes if present
        if (parsed.insight) {
            parsed.insight = parsed.insight.replace(/—/g, ',').replace(/\s+/g, ' ').trim()
        }

        return parsed
    } catch (error) {
        console.error('[insight-gemini] Error calling Gemini:', error)
        return null
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function generateInsightText(
    signal: InsightSignal,
    userContext: UserContext
): Promise<string | null> {
    return generateInsightWithLevel(signal, userContext, 'brief')
}

export async function generateMealInsight(
    signal: MealInsightSignal | null,
    userContext: UserContext
): Promise<string | null> {
    if (!signal) return null
    return generateInsightWithLevel(signal, userContext, 'brief')
}

export async function generateDailyInsight(
    signal: DailyInsightSignal,
    userContext: UserContext
): Promise<string | null> {
    return generateInsightWithLevel(signal, userContext, 'brief')
}

export async function generateWhatNextHint(
    signal: WhatNextSignal | null,
    userContext: UserContext
): Promise<string | null> {
    if (!signal) return null
    const prompt = buildWhatNextPrompt(signal, userContext)
    const response = await callGeminiForInsight(prompt, 40)
    return response?.insight || null
}

export async function generateDetailedMealInsight(
    signal: MealInsightSignal | null,
    userContext: UserContext
): Promise<string | null> {
    if (!signal) return null
    return generateInsightWithLevel(signal, userContext, 'detailed')
}

export async function generateDetailedDailyInsight(
    signal: DailyInsightSignal,
    userContext: UserContext
): Promise<string | null> {
    return generateInsightWithLevel(signal, userContext, 'detailed')
}

async function generateInsightWithLevel(
    signal: InsightSignal,
    userContext: UserContext,
    level: DetailLevel
): Promise<string | null> {
    let prompt: string
    const maxTokens = level === 'brief' ? 60 : 150

    switch (signal.type) {
        case 'meal':
            prompt = buildMealPrompt(signal, userContext, level)
            break
        case 'daily':
            prompt = buildDailyPrompt(signal, userContext, level)
            break
        case 'whatnext':
            prompt = buildWhatNextPrompt(signal, userContext)
            break
        default:
            return null
    }

    const response = await callGeminiForInsight(prompt, maxTokens)
    return response?.insight || null
}

// ============================================================================
// CACHING (server-side)
// ============================================================================

const insightCache = new Map<string, { text: string; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

function getCacheKey(signal: InsightSignal, userId?: string, level: DetailLevel = 'brief'): string {
    return `${signal.type}:${level}:${userId || 'anon'}:${JSON.stringify(signal.facts)}`
}

export async function generateInsightCached(
    signal: InsightSignal,
    userContext: UserContext,
    userId?: string
): Promise<string | null> {
    const key = getCacheKey(signal, userId, 'brief')
    const cached = insightCache.get(key)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.text
    }

    const text = await generateInsightText(signal, userContext)
    if (text) {
        insightCache.set(key, { text, timestamp: Date.now() })
    }
    return text
}

export async function generateDetailedInsightCached(
    signal: InsightSignal,
    userContext: UserContext,
    userId?: string
): Promise<string | null> {
    const key = getCacheKey(signal, userId, 'detailed')
    const cached = insightCache.get(key)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.text
    }

    let text: string | null = null
    if (signal.type === 'meal') {
        text = await generateDetailedMealInsight(signal, userContext)
    } else if (signal.type === 'daily') {
        text = await generateDetailedDailyInsight(signal, userContext)
    }

    if (text) {
        insightCache.set(key, { text, timestamp: Date.now() })
    }
    return text
}
