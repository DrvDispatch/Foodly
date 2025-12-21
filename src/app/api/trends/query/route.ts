import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { GoogleGenAI, Type } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

/**
 * POST /api/trends/query
 * 
 * Uses AI to convert natural language into structured filters for trend data.
 * 
 * IMPORTANT AI RESTRICTIONS:
 * - Can ONLY filter, group, or highlight existing data
 * - Cannot infer causes or recommendations
 * - Cannot compute new insights
 * - Read-only: just transforms queries into filters
 */

// Response schema for structured output
const queryResponseSchema = {
    type: Type.OBJECT,
    properties: {
        filterType: {
            type: Type.STRING,
            enum: ['day_of_week', 'threshold', 'range', 'none'],
            description: 'Type of filter to apply'
        },
        daysOfWeek: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: 'Days of week to filter (0=Sunday, 6=Saturday)'
        },
        thresholdMetric: {
            type: Type.STRING,
            enum: ['calories', 'protein', 'carbs', 'fat'],
            description: 'Metric for threshold filter'
        },
        thresholdOperator: {
            type: Type.STRING,
            enum: ['above', 'below', 'equals'],
            description: 'Threshold comparison operator'
        },
        thresholdValue: {
            type: Type.NUMBER,
            description: 'Threshold value'
        },
        interpretation: {
            type: Type.STRING,
            description: 'Brief description of what the filter does'
        }
    },
    required: ['filterType', 'interpretation']
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { query, goals } = body

        if (!query?.trim()) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { profile: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const prompt = `You are a trend data filter assistant. Convert the user's natural language query into a structured filter.

CRITICAL RULES:
- You can ONLY filter, group, or highlight existing data
- You CANNOT infer causes, give advice, or compute new insights
- Just understand what data the user wants to see

User's goals:
- Calories: ${goals?.calories || 2000} kcal
- Protein: ${goals?.protein || 150}g
- Carbs: ${goals?.carbs || 200}g
- Fat: ${goals?.fat || 70}g

Available filter types:
1. day_of_week: Filter to specific days (weekends = [0,6], weekdays = [1,2,3,4,5])
2. threshold: Filter values above/below a number (e.g., "under 1500 calories")
3. range: Filter to a date range (not implemented yet, use 'none')
4. none: Cannot be converted to a filter

User query: "${query}"

Return a structured filter.`

        const result = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: queryResponseSchema
            }
        })

        const filterData = JSON.parse(result.text || '{}')

        return NextResponse.json(filterData)

    } catch (error) {
        console.error('Trends Query API Error:', error)
        return NextResponse.json({
            filterType: 'none',
            interpretation: 'Could not understand the query'
        })
    }
}
