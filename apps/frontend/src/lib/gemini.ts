import { GoogleGenAI, ThinkingLevel } from '@google/genai'

// Initialize the client - fresh instance each call to ensure env is loaded
function getAI() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
}

/**
 * Detect MIME type from base64 data URI or raw base64
 */
function detectMimeType(base64String: string): string {
    // Check if it's a data URI with MIME type
    const dataUriMatch = base64String.match(/^data:(image\/\w+);base64,/)
    if (dataUriMatch) {
        return dataUriMatch[1]
    }

    // Try to detect from magic bytes
    const cleanBase64 = base64String.replace(/^data:image\/\w+;base64,/, '')

    // Decode first few bytes to check magic numbers
    try {
        const bytes = Buffer.from(cleanBase64.substring(0, 16), 'base64')

        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'image/png'
        }

        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'image/jpeg'
        }

        // WebP: RIFF....WEBP
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            return 'image/webp'
        }

        // GIF: 47 49 46 38
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
            return 'image/gif'
        }
    } catch {
        // Fall back to jpeg if detection fails
    }

    // Default to JPEG
    return 'image/jpeg'
}

/**
 * Clean base64 string - remove data URI prefix if present
 */
function cleanBase64(base64String: string): string {
    return base64String.replace(/^data:image\/\w+;base64,/, '')
}

// Response schema for structured output - per spec requirement
const mealAnalysisSchema = {
    type: 'object',
    properties: {
        mealType: {
            type: 'string',
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            description: 'Detected meal type based on food content and timestamp',
        },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the food item' },
                    portionDescription: { type: 'string', description: 'Description of portion size' },
                    estimatedGrams: { type: 'number', description: 'Estimated weight in grams' },
                    calories: { type: 'number', description: 'Estimated calories' },
                    protein: { type: 'number', description: 'Protein in grams' },
                    carbs: { type: 'number', description: 'Carbohydrates in grams' },
                    fat: { type: 'number', description: 'Fat in grams' },
                    fiber: { type: 'number', description: 'Fiber in grams' },
                    confidence: { type: 'number', description: 'Confidence score 0-1' },
                },
                required: ['name', 'portionDescription', 'estimatedGrams', 'calories', 'protein', 'carbs', 'fat', 'confidence'],
            },
        },
        totalNutrition: {
            type: 'object',
            properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' },
                fiber: { type: 'number', description: 'Total fiber in grams' },
                // Micronutrients
                vitaminD: { type: 'number', description: 'Vitamin D in mcg' },
                vitaminC: { type: 'number', description: 'Vitamin C in mg' },
                vitaminB12: { type: 'number', description: 'Vitamin B12 in mcg' },
                iron: { type: 'number', description: 'Iron in mg' },
                calcium: { type: 'number', description: 'Calcium in mg' },
                magnesium: { type: 'number', description: 'Magnesium in mg' },
                zinc: { type: 'number', description: 'Zinc in mg' },
                potassium: { type: 'number', description: 'Potassium in mg' },
            },
            required: ['calories', 'protein', 'carbs', 'fat'],
        },
        overallConfidence: { type: 'number', description: 'Overall confidence 0-1' },
        qualityScore: { type: 'number', description: 'Food quality 0-100' },
        title: {
            type: 'string',
            description: 'Short, appetizing title for the meal (max 5-7 words). E.g. "Fluffy Blueberry Pancakes", "Grilled Salmon with Veggies"',
        },
        description: {
            type: 'string',
            description: 'Detailed description of the meal including all items, portions, and preparation style. E.g., "2 large pancakes with maple syrup and butter, served with 3 strips of crispy bacon and a glass of orange juice"',
        },
        notes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Brief notes about the meal',
        },
    },
    required: ['mealType', 'title', 'items', 'totalNutrition', 'overallConfidence', 'description'],
}

export interface MealAnalysisResult {
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    title: string
    items: {
        name: string
        portionDescription: string
        estimatedGrams: number
        calories: number
        protein: number
        carbs: number
        fat: number
        fiber?: number
        confidence: number
    }[]
    totalNutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
        fiber?: number
        // Micronutrients
        vitaminD?: number    // mcg
        vitaminC?: number    // mg
        vitaminB12?: number  // mcg
        iron?: number        // mg
        calcium?: number     // mg
        magnesium?: number   // mg
        zinc?: number        // mg
        potassium?: number   // mg
    }
    overallConfidence: number
    qualityScore?: number
    description: string
    notes?: string[]
}

/**
 * Analyze a meal using Gemini 3 Flash Preview
 * 
 * Per spec requirements:
 * - Model: gemini-3-flash-preview (HARD CONSTRAINT)
 * - Structured output: responseMimeType + responseJsonSchema
 * - Meal type inferred from image + timestamp (no user selection)
 */
export async function analyzeMeal(
    description?: string,
    imageBase64?: string,
    timestamp?: string,
    additionalImages?: string[],
): Promise<MealAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured')
    }

    console.log('[Gemini] API Key present:', apiKey.substring(0, 10) + '...')

    // Get time context for meal type inference
    const mealTime = timestamp ? new Date(timestamp) : new Date()
    const hour = mealTime.getHours()
    const timeContext = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
    const formattedTime = mealTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
    const formattedDate = mealTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    })

    // Build prompt with timestamp for meal type inference
    let prompt = `You are a nutrition analysis expert. Analyze this meal image and provide HIGHLY DETAILED nutritional estimates.

TIMESTAMP CONTEXT:
- Date: ${formattedDate}
- Time: ${formattedTime} (${timeContext})

MEAL TYPE INFERENCE (use both food content AND timestamp):
- breakfast: Typically 5am-10am, morning foods like eggs, toast, cereal, pancakes, coffee
- lunch: Typically 11am-2pm, midday foods like sandwiches, salads, soups
- dinner: Typically 5pm-9pm, evening meals with heavier dishes, full plates
- snack: Light foods, or eating outside typical meal windows

PORTION ESTIMATION GUIDELINES (CRITICAL FOR CONSISTENCY):
- Assume TYPICAL serving sizes based on common dietary references (USDA, standard restaurant portions)
- Avoid extreme assumptions (neither minimum nor maximum)
- If multiple plausible portion sizes exist, select the MOST TYPICAL one
- Use visual cues: plate size (standard ~10-12 inch), hand comparison, common container sizes
- For stacked items (pancakes, burgers), count visible layers and use standard thickness
- Internally consider reasonable lower and upper bounds, then return a single TYPICAL estimate

DESCRIPTION REQUIREMENT (CRITICAL - DO NOT OMIT ANYTHING):
- Provide an EXTREMELY DETAILED description of EVERYTHING visible in the meal
- List EVERY food item visible, no matter how small (sauces, garnishes, drinks, sides)
- Include preparation methods (grilled, fried, steamed, raw)
- Include approximate quantities (2 eggs, 3 strips of bacon, 1 cup of rice)
- Include colors, textures, and visual indicators (golden brown, crispy, creamy)
- Format: "A [meal type] consisting of [detailed item 1], [detailed item 2], [etc]. Served with [sides/drinks]."
- Example: "A hearty breakfast consisting of 2 large sunny-side-up eggs with runny yolks, 4 strips of crispy maple-glazed bacon, 2 thick slices of whole wheat toast with butter, a small portion of sautéed spinach, and a glass of fresh-squeezed orange juice."

NUTRITION ANALYSIS:
- Identify EVERY distinct food item visible (do not skip small items)
- Estimate portion sizes using the guidelines above
- Calculate MACRONUTRIENTS: calories, protein, carbs, fat, fiber
- Estimate MICRONUTRIENTS realistically based on food composition:
  • Vitamin D (mcg) - eggs ~2mcg each, fatty fish ~15mcg/serving, fortified foods vary
  • Vitamin C (mg) - orange ~70mg, bell pepper ~80mg, broccoli ~50mg/cup
  • Vitamin B12 (mcg) - meat ~2-3mcg/serving, eggs ~0.5mcg each, dairy ~1mcg/cup
  • Iron (mg) - red meat ~3mg/serving, spinach ~3mg/cup, legumes ~2mg/serving
  • Calcium (mg) - dairy ~300mg/cup, fortified foods ~100mg, leafy greens ~50mg
  • Magnesium (mg) - nuts ~50mg/oz, whole grains ~40mg/serving, spinach ~80mg/cup
  • Zinc (mg) - meat ~5mg/serving, shellfish ~10mg/serving, legumes ~2mg/serving
  • Potassium (mg) - banana ~400mg, potato ~600mg, spinach ~150mg/cup
- Use REALISTIC values based on actual food composition data
- Assign confidence scores (0-1) based on certainty
- Provide overall quality score (0-100) based on nutrient density
`

    if (description) {
        prompt += `\nUser description: ${description}\n`
    }

    prompt += '\nAnalyze the meal thoroughly. Return structured JSON with COMPLETE description and ALL macro/micronutrients.'



    try {
        const ai = getAI()

        // Build parts array - images first, then text
        const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

        // Add primary image with proper MIME type detection
        if (imageBase64) {
            const mimeType = detectMimeType(imageBase64)
            const base64Data = cleanBase64(imageBase64)
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            })
            console.log('[Gemini] Added primary image, mimeType:', mimeType, ', base64 length:', base64Data.length)
        }

        // Add additional images with proper MIME type detection
        if (additionalImages && additionalImages.length > 0) {
            for (const img of additionalImages.slice(0, 3)) {
                const mimeType = detectMimeType(img)
                const base64Data = cleanBase64(img)
                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                })
            }
            console.log('[Gemini] Added', additionalImages.length, 'additional images')
        }

        // Add text prompt last
        parts.push({ text: prompt })

        // HARD CONSTRAINT: Must use gemini-3-flash-preview
        const modelName = 'gemini-3-flash-preview'
        console.log(`[Gemini] Calling ${modelName} with ${parts.length - 1} image(s)`)

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: 'user',
                    parts: parts,
                },
            ],
            config: {
                // HARD CONSTRAINT: Structured output with JSON schema
                responseMimeType: 'application/json',
                responseJsonSchema: mealAnalysisSchema,
                // LOW temperature for consistent portion/macro estimation
                temperature: 0.25,
                // HIGH thinking for better reasoning about portions
                thinkingConfig: {
                    thinkingLevel: ThinkingLevel.HIGH,
                },
            },
        })

        let text = response.text
        console.log(`[Gemini] Response received, length: ${text?.length || 0}`)

        if (!text) {
            throw new Error('Empty response from Gemini')
        }

        // Strip markdown code fences if present (rare but can happen)
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

        const parsed = JSON.parse(text) as MealAnalysisResult
        console.log(`[Gemini] ✓ Parsed: ${parsed.mealType}, ${parsed.totalNutrition.calories} kcal, ${parsed.items.length} items`)

        return parsed
    } catch (error) {
        console.error('[Gemini] ✗ Analysis error:', error)
        throw error
    }
}
