import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

/**
 * POST /api/profile/explain
 * AI explains why targets are set as they are
 * 
 * CRITICAL: No advice, no optimization, no "should"
 * Only explains the calculation rationale
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id }
        })

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Build context
        const goalLabels: Record<string, string> = {
            fat_loss: 'fat loss',
            maintenance: 'maintenance',
            muscle_gain: 'muscle gain',
            strength: 'strength training',
            recomp: 'body recomposition',
            health: 'general health'
        }

        const activityLabels: Record<string, string> = {
            sedentary: 'sedentary (little exercise)',
            light: 'lightly active (1-3 days/week)',
            moderate: 'moderately active (3-5 days/week)',
            active: 'active (6-7 days/week)',
            athlete: 'very active (athlete or physical job)'
        }

        const prompt = `You are explaining nutrition targets to a user. Be factual and educational. DO NOT give advice, suggestions, or use "should".

Context:
- Goal: ${goalLabels[profile.goalType || 'maintenance'] || 'maintenance'}
- Sex: ${profile.sex || 'not specified'}
- Age: ${profile.age || 'not specified'}
- Height: ${profile.heightCm || 'not specified'} cm
- Current weight: ${profile.currentWeight || 'not specified'} kg
- Target weight: ${profile.targetWeight || 'not specified'} kg
- Activity level: ${activityLabels[profile.activityLevel || 'moderate'] || 'moderate'}
- Weekly pace: ${profile.weeklyPace || 'not specified'} kg/week

Calculated targets:
- Maintenance calories: ${profile.maintenanceCal || 'not calculated'}
- Target calories: ${profile.targetCal || 'not calculated'}
- Protein: ${profile.proteinTarget || 'not calculated'}g
- Carbs: ${profile.carbTarget || 'not calculated'}g
- Fat: ${profile.fatTarget || 'not calculated'}g

Write 2-3 sentences explaining how these targets were calculated based on the user's stats and goal. Be educational, not prescriptive.

Example format:
"Your calorie target of X is based on your estimated maintenance of Y, adjusted for your [goal] goal. Your protein target of Zg supports [goal explanation]. These calculations use standard formulas like Mifflin-St Jeor for BMR."

DO NOT say "you should eat" or give any advice.`

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
        })

        const explanation = result.text?.trim() || 'Unable to generate explanation.'

        return NextResponse.json({ explanation })

    } catch (error) {
        console.error('Profile Explain Error:', error)
        return NextResponse.json({
            explanation: 'Your targets are calculated based on your body stats, activity level, and goal.'
        })
    }
}
