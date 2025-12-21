import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI, Type } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Structured output schema for normalcy indicator
const normalcyResponseSchema = {
    type: Type.OBJECT,
    properties: {
        message: {
            type: Type.STRING,
            description: 'A single reassuring sentence about the weight trend. Max 55 characters. No advice.'
        },
        type: {
            type: Type.STRING,
            enum: ['success', 'info', 'warning'],
            description: 'success = on track (green), info = neutral (blue), warning = needs attention (amber)'
        }
    },
    required: ['message', 'type']
}

/**
 * POST /api/trends/weight-normalcy
 * 
 * Returns AI-generated reassurance message for weight trends.
 * Context-aware, factual, and supportive — never prescriptive.
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const {
            entries,
            direction,
            goalType,
            targetWeight,
            currentWeight,
            weeklyPace,
            weeksToTarget
        } = body

        if (!entries || entries.length === 0) {
            return NextResponse.json({
                message: 'Add weight entries to see insights',
                type: 'info'
            })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // --- CLEAR CONTEXT CALCULATION ---
        const entryCount = entries.length
        const sortedEntries = [...entries].sort((a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        const firstWeight = sortedEntries[0]?.weight
        const lastWeight = sortedEntries[sortedEntries.length - 1]?.weight

        const daySpan = entryCount > 1
            ? Math.round((new Date(sortedEntries[entryCount - 1].date).getTime() - new Date(sortedEntries[0].date).getTime()) / (1000 * 60 * 60 * 24))
            : 0

        // Actual numeric change
        const totalChange = lastWeight - firstWeight
        const changeSign = totalChange > 0 ? '+' : ''

        // Explicit direction description
        const actualDirection = totalChange > 0.2 ? 'GAINING weight (upward trend)' :
            totalChange < -0.2 ? 'LOSING weight (downward trend)' :
                'maintaining (stable, minimal change)'

        // Goal in plain English
        const goalInPlainEnglish =
            goalType === 'muscle_gain' ? 'GAIN weight/muscle' :
                goalType === 'strength' ? 'GAIN strength (which often means gaining weight)' :
                    goalType === 'fat_loss' ? 'LOSE weight/fat' :
                        goalType === 'recomp' ? 'LOSE fat while maintaining/gaining muscle' :
                            'MAINTAIN current weight'

        // Is this aligned?
        const isOnTrack = (
            (goalType === 'muscle_gain' && totalChange > 0.1) ||
            (goalType === 'strength' && totalChange > 0.1) ||
            (goalType === 'fat_loss' && totalChange < -0.1) ||
            (goalType === 'recomp' && totalChange < 0) ||
            (goalType === 'maintenance' && Math.abs(totalChange) < 0.5)
        )

        const distanceToTarget = targetWeight ? Math.abs(targetWeight - lastWeight) : null

        // VERY EXPLICIT PROMPT
        const prompt = `You are a supportive fitness analyst. Generate ONE short reassuring sentence (max 55 chars) about this weight trend.

=== CRITICAL DATA (read carefully) ===
• User's GOAL: ${goalInPlainEnglish}
• User is currently: ${actualDirection}
• Net weight change: ${changeSign}${totalChange.toFixed(1)} kg over ${daySpan} days
• First weight: ${firstWeight?.toFixed(1)} kg → Current: ${lastWeight?.toFixed(1)} kg
• Is this aligned with their goal? ${isOnTrack ? 'YES ✓' : 'NO ✗'}
• Target weight: ${targetWeight ? targetWeight + ' kg' : 'not set'}
• Distance to target: ${distanceToTarget ? distanceToTarget.toFixed(1) + ' kg' : 'N/A'}
• Entries: ${entryCount} weigh-ins

=== YOUR TASK ===
${isOnTrack ?
                `The user IS on track. Celebrate progress! Examples:
    - "+1.2 kg gained — solid progress for muscle gain"
    - "This upward trend matches your bulking goal"
    - "Gaining at a healthy pace for muscle building"` :
                `The user is NOT on track. Be reassuring but honest. Examples:
    - "Fluctuations are normal, stay consistent"
    - "Progress takes time, you're building habits"`
            }

=== RULES ===
- Max 55 characters
- No advice ("try...", "consider...")
- Be specific about what's happening
- If gaining weight for muscle gain goal → type: "success"
- If maintaining but goal is muscle gain → type: "info" (not bad, but not progress)

Return JSON: { "message": "...", "type": "success|info|warning" }`

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: normalcyResponseSchema,
                temperature: 0.2
            }
        })

        const parsed = JSON.parse(result.text || '{}')

        return NextResponse.json({
            message: parsed.message || 'Weight trend looks normal',
            type: parsed.type || 'info'
        })

    } catch (error) {
        console.error('Weight Normalcy API Error:', error)
        return NextResponse.json({
            message: 'Weight fluctuations are completely normal',
            type: 'info'
        }, { status: 200 })
    }
}
