import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI, Type } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Structured output schema for human-first AI
const explainResponseSchema = {
    type: Type.OBJECT,
    properties: {
        headline: {
            type: Type.STRING,
            description: 'One sentence, goal-aware, non-judgmental. No numbers unless necessary.'
        },
        guidance: {
            type: Type.STRING,
            description: 'One to two sentences of forward-looking, actionable guidance. Use conditional language like "over the next few days" or "if this pattern continues".'
        },
        technical: {
            type: Type.STRING,
            description: 'Technical explanation with averages, variance, percentages. For users who want details.'
        }
    },
    required: ['headline', 'guidance', 'technical']
}

/**
 * POST /api/trends/explain
 * 
 * Returns structured AI output:
 * - headline: Goal-aware, 1 sentence
 * - guidance: Forward-looking, actionable (not prescriptive)
 * - technical: Stats for power users (collapsible)
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { metric, range, stats, goal, dataPoints } = body

        if (!metric || !stats) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get user's goal type
        const goalType = (user.profile as any)?.goal || 'maintenance'
        const goalContext = goalType === 'fat_loss' ? 'fat loss' :
            goalType === 'muscle_gain' ? 'muscle gain' : 'maintenance'

        // Build context
        const trendDirection = stats.trend === 'up' ? 'increasing' : stats.trend === 'down' ? 'decreasing' : 'stable'
        const avgVsGoal = stats.mean > goal ? 'above' : stats.mean < goal ? 'below' : 'at'
        const diffPercent = Math.abs(Math.round(((stats.mean - goal) / goal) * 100))
        const loggedDays = dataPoints?.filter((d: any) => d.mealCount > 0).length || 0
        const totalDays = dataPoints?.length || 0

        const rangeLabel = range === '7d' ? 'this week' : range === '30d' ? 'this month' : 'recently'

        const prompt = `You are a nutrition trend analyst helping someone with a ${goalContext} goal. Generate structured output with:

1. HEADLINE: One sentence describing what's happening with their ${metric} ${rangeLabel}. Goal-aware, non-judgmental. Avoid numbers.
   - Good: "Your intake has been higher than your ${goalContext} target on logged days."
   - Bad: "You consumed 3784 calories averaging 26% above target."

2. GUIDANCE: One to two sentences of forward-looking, directional advice. Use conditional language.
   ✅ Allowed: "Over the next few days...", "If this pattern continues...", "Aiming for X may help..."
   ❌ Not allowed: "You should eat...", "Do this tomorrow...", "This is bad/good"
   - Good: "If this pattern continues, prioritizing lighter dinners or higher-protein meals could help rebalance intake."
   - Bad: "You should eat less. This is too high."

3. TECHNICAL: Stats for power users. Include averages, variance, percentages, logged days.

Context:
- Metric: ${metric}
- User's goal: ${goalContext}
- Time range: ${rangeLabel} (${totalDays} days)
- Average: ${stats.mean} (target: ${goal}, ${diffPercent}% ${avgVsGoal})
- Trend: ${trendDirection}
- Variance: ±${stats.stdDev}
- Data coverage: ${loggedDays}/${totalDays} days logged

Return JSON with headline, guidance, and technical fields.`

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: explainResponseSchema
            }
        })

        const parsed = JSON.parse(result.text || '{}')

        return NextResponse.json({
            headline: parsed.headline || 'Unable to analyze this trend.',
            guidance: parsed.guidance || '',
            technical: parsed.technical || '',
            confidence: {
                loggedDays,
                totalDays
            }
        })

    } catch (error) {
        console.error('Trends Explain API Error:', error)
        return NextResponse.json({
            headline: 'Unable to analyze this trend.',
            guidance: '',
            technical: '',
            error: 'Failed to generate explanation'
        }, { status: 500 })
    }
}

