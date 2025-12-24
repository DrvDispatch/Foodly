/**
 * Coach AI - Gemini-powered reflection and conversation
 * 
 * TONE RULES:
 * - Explanatory > persuasive
 * - Conditional > prescriptive
 * - Curious > corrective
 * 
 * SAFEGUARD:
 * - AI cannot introduce new advice that contradicts the automatic reflection
 */

import { GoogleGenAI } from '@google/genai'
// import { Profile } from '@prisma/client'
import { PRIMARY_GOAL_LABELS } from './insights'

function getAI() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
}

interface DaySummary {
    calories: number
    protein: number
    carbs: number
    fat: number
}

interface MealContext {
    description: string
    nutrition: DaySummary | null
}

interface ReflectionInput {
    profile: any | null
    daySummary: DaySummary
    meals: MealContext[]
    recentReflections: string[]
}

interface ReplyInput {
    question: string
    profile: any | null
    recentMessages: { role: string; content: string }[]
    daySummary: DaySummary
    meals: string[]
}

/**
 * Generate daily reflection (paragraph summary)
 */
export async function generateDailyReflection(input: ReflectionInput): Promise<string> {
    const { profile, daySummary, meals, recentReflections } = input

    const goalLabel = profile?.goalType
        ? PRIMARY_GOAL_LABELS[profile.goalType as keyof typeof PRIMARY_GOAL_LABELS]?.label || profile.goalType
        : 'general health'

    const mealList = meals.map(m => m.description).join(', ')

    // Calculate vs targets
    const calPct = profile?.targetCal ? Math.round((daySummary.calories / profile.targetCal) * 100) : null
    const proteinPct = profile?.proteinTarget ? Math.round((daySummary.protein / profile.proteinTarget) * 100) : null

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
`.trim()

    try {
        const ai = getAI()
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.8, // Varied but controlled for daily reflections
                maxOutputTokens: 300,
            },
        })

        const text = response.text?.trim()
        if (!text) return 'Unable to generate reflection at this time.'

        // Robust JSON parsing with fallback
        let parsed: { reflection?: string }
        try {
            parsed = JSON.parse(text)
        } catch {
            // Try to extract JSON from mixed response
            const jsonMatch = text.match(/\{[\s\S]*"reflection"[\s\S]*\}/)
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0])
                } catch {
                    // Use text directly if reasonable length
                    if (text.length > 20 && text.length < 500) {
                        return text.replace(/["/]/g, '').trim()
                    }
                    return 'Unable to generate reflection at this time.'
                }
            } else {
                // Use text directly if reasonable length
                if (text.length > 20 && text.length < 500) {
                    return text.replace(/["/]/g, '').trim()
                }
                return 'Unable to generate reflection at this time.'
            }
        }
        return parsed.reflection || 'Unable to generate reflection at this time.'
    } catch (error) {
        console.error('[coach-ai] Reflection error:', error)
        return 'Unable to generate reflection at this time.'
    }
}

/**
 * Generate conversational reply to user question
 */
export async function generateCoachReply(input: ReplyInput): Promise<string> {
    const { question, profile, recentMessages, daySummary, meals } = input

    const goalLabel = profile?.goalType
        ? PRIMARY_GOAL_LABELS[profile.goalType as keyof typeof PRIMARY_GOAL_LABELS]?.label || profile.goalType
        : 'general health'

    // Find today's reflection if any
    const todayReflection = recentMessages.find(m => m.role === 'coach' && m.content.length > 100)

    const conversationHistory = recentMessages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
        .join('\n')

    const prompt = `
You are a calm, informed nutrition coach having a conversation with a user.

USER CONTEXT:
- Goal: ${goalLabel}
- Targets: ${profile?.targetCal || '?'} cal, ${profile?.proteinTarget || '?'}g protein

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
`.trim()

    try {
        const ai = getAI()
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 1.0, // Natural conversational style for coach chat
                maxOutputTokens: 200,
            },
        })

        const text = response.text?.trim()
        if (!text) return "I'm having trouble responding right now. Please try again."

        // Robust JSON parsing with fallback
        let parsed: { reply?: string }
        try {
            parsed = JSON.parse(text)
        } catch {
            // Try to extract JSON from mixed response
            const jsonMatch = text.match(/\{[\s\S]*"reply"[\s\S]*\}/)
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0])
                } catch {
                    // Use text directly if reasonable length
                    if (text.length > 10 && text.length < 300) {
                        return text.replace(/["/]/g, '').trim()
                    }
                    return "I'm having trouble responding right now. Please try again."
                }
            } else {
                // Use text directly if reasonable length
                if (text.length > 10 && text.length < 300) {
                    return text.replace(/["/]/g, '').trim()
                }
                return "I'm having trouble responding right now. Please try again."
            }
        }
        return parsed.reply || "I'm having trouble responding right now. Please try again."
    } catch (error) {
        console.error('[coach-ai] Reply error:', error)
        return "I'm having trouble responding right now. Please try again."
    }
}
