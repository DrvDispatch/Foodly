# Nutri App Architecture & Flow

A comprehensive guide to how the nutrition tracking app works, from user onboarding to intelligent meal insights.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Onboarding Flow](#onboarding-flow)
3. [Meal Logging](#meal-logging)
4. [The Intelligence Stack](#the-intelligence-stack)
5. [Insight Generation](#insight-generation)
6. [UI Hierarchy](#ui-hierarchy)
7. [AI Supervisor (Phase 3)](#future-ai-supervisor-phase-3)
8. [Design Constraints](#design-constraints)

---

## Philosophy

### Core Principle: Coach, Not Dictator

The app is designed to be an **intelligent assistant**, not a rule enforcer.

| Traditional Tracker | This App |
|---------------------|----------|
| Shows numbers only | Interprets meaning |
| Generic feedback | Goal-aware insights |
| Judges meals | Acknowledges context |
| Commands action | Suggests conditionally |

### Trust Preservation

The most critical design principle:

> **Never critique without acknowledging a plausible valid use case.**

A high-carb meal isn't "wrong" — it might be intentional pre-workout fuel. The app must respect user intelligence and intent.

### Good Faith Assumption

> **Users are assumed to be acting in good faith and with intentionality unless strong evidence suggests otherwise.**

This reinforces the anti-judgment stance. If a meal looks "off," assume intent before assuming mistake.

### Opt-In Consent

> **By selecting a primary goal, the user opts into goal-aligned recommendations, including conditional suggestions that may challenge their current behavior.**

This justifies statements like:
- "If compatible with your preferences, animal protein may help…"
- "Consider a protein-forward dinner to meet your goal"

The user explicitly chose to receive goal-relevant guidance.

### Scientific Grounding

Gemini prompts require:
- **Consensus-level reasoning only** — no speculative or fringe claims
- **Probabilistic language** — "may", "tends to", "often"
- **No novel claims** — established nutrition science only

---

## Onboarding Flow

### Purpose

Onboarding captures the context needed to personalize all insights. Without this, the app cannot reason about whether a meal or day is "good" for the user.

### Step 1: Primary Goal Selection

**File:** `src/app/onboarding/goal/page.tsx`

The user selects ONE primary goal:

| Goal | Description | Insight Bias |
|------|-------------|--------------|
| Fat Loss | Lose body fat while preserving muscle | Deficit awareness, protein priority |
| Maintenance | Keep current weight stable | Balance-focused |
| Muscle Gain | Build muscle with surplus | Surplus encouragement, protein priority |
| Strength | Optimize for lifting/athletic output | Carb importance, training timing |
| Recomposition | Slowly lose fat while building muscle | Protein maximization, patience |
| General Health | Overall wellness and nutrition quality | Micronutrient awareness |

**Why it matters:** Every insight is framed relative to this goal. "Low protein" means something different for fat loss vs. general health.

### Step 2: Secondary Focus Selection

**File:** `src/app/onboarding/focus/page.tsx`

The user selects 0-2 optional secondary focuses:

| Focus | How It Affects Insights |
|-------|------------------------|
| Vegan/Vegetarian | Acknowledges plant protein challenges (leucine, B12) |
| Strength Training | Emphasizes workout timing, carb importance |
| Endurance | Carb loading, glycogen awareness |
| Longevity | Micronutrient quality, fiber emphasis |
| Satiety | Fat and fiber for hunger control |
| Aesthetic | Body composition nuance |
| Metabolic Health | Blood sugar, insulin awareness |

**Why it matters:** These modify how Gemini phrases insights. A "low protein" warning sounds different for a vegan vs. omnivore.

### Step 3: Body Metrics

**File:** `src/app/onboarding/body/page.tsx`

Captures:
- Age, sex, height
- Current weight
- Target weight (optional)

**Why it matters:** Required for calorie/macro target calculations.

### Step 4: Activity Level

**File:** `src/app/onboarding/activity/page.tsx`

Options: Sedentary → Light → Moderate → Active → Athlete

**Why it matters:** Multiplier for TDEE (Total Daily Energy Expenditure) calculation.

### Step 5: Target Calculation

**File:** `src/app/onboarding/targets/page.tsx`

System calculates:
- Maintenance calories (BMR × activity multiplier)
- Target calories (adjusted for goal)
- Macro targets (protein, carbs, fat)

User can adjust if needed.

### Future Extensibility: Guidance Tolerance

> Future versions may allow users to choose how directive insights should be (gentle nudges vs. direct coaching).

### Data Storage

All onboarding data saved to `Profile` model in Prisma:
- `goalType`: Primary goal string
- `secondaryFocus`: JSON array of focuses
- Numeric targets stored directly

---

## Meal Logging

### The User Experience

1. User taps FAB (floating action button) on home screen
2. QuickAdd sheet opens
3. User can:
   - Take a photo of their meal
   - Upload an existing photo
   - Add optional text description
   - Select date/time (defaults to now)
4. Submit triggers Gemini analysis
5. Meal appears in list with "Analyzing..." state
6. Once complete, nutrition data and insight appear

### The Technical Flow

```
User Input (photo + description)
        ↓
    API: POST /api/meals
        ↓
    Create Meal record (isAnalyzing = true)
        ↓
    Queue Gemini Vision analysis
        ↓
    Gemini returns structured nutrition data:
    - foods: [{ name, portion, calories, protein, carbs, fat, fiber, confidence }]
    - overall confidence
    - reasoning
        ↓
    Create NutritionSnapshot record
        ↓
    Mark meal as analyzed (isAnalyzing = false)
        ↓
    Client polls and receives updated meal
```

### Gemini Vision Analysis

**File:** `src/lib/gemini.ts`

The meal analysis prompt asks Gemini to:
1. Identify all foods visible in the photo
2. Estimate portion sizes using visual cues
3. Calculate macros for each food
4. Provide confidence score (0-100)
5. Explain reasoning

**Key design:** Gemini uses structured JSON output schema for reliable parsing.

### Manual Correction Feedback Loop

When users edit meal data (description or macros), this:
- Provides immediate correction
- Signals areas where AI estimation was weak
- Future: aggregated corrections can improve prompts

---

## The Intelligence Stack

This is where the app becomes "smart." There are **four distinct layers**:

### Layer 1: Raw Data

The meal's nutrition numbers:
- Calories: 650
- Protein: 12g
- Carbs: 85g
- Fat: 28g

This is just data. It has no meaning without context.

### Layer 2: Signal Detection (Rules Engine)

**File:** `src/lib/insights.ts`

The rules engine analyzes raw data and detects **signals** — structured facts about the meal's composition.

```typescript
interface MealInsightSignal {
    type: 'meal'
    priority: 'low' | 'medium' | 'high'
    facts: {
        lowProtein?: boolean    // protein < 20% of macros
        highProtein?: boolean   // protein > 35% of macros
        lowCarbs?: boolean      // carbs < 15% of macros
        highCarbs?: boolean     // carbs > 65% of macros
        highFat?: boolean       // fat > 50% of macros
        lightMeal?: boolean     // calories < 150
        substantialMeal?: boolean // calories > 700
    }
    userGoal: PrimaryGoal
    secondaryFocuses: SecondaryFocus[]
    meal: MealNutrition
}
```

**What signals are NOT:**
- They are not text
- They are not judgments
- They are not recommendations

Signals are **objective facts** about the meal's macro distribution.

**Signals are lossy by design:** Not every nuance becomes a signal. This is intentional — we capture the most relevant patterns, not every detail.

**Why this layer exists:**
- Determinism: Same input → same signal
- Testability: Rules can be unit tested
- Safety: No hallucination risk
- Speed: No API call needed

### Layer 3: Gemini Phrasing (Natural Language)

**File:** `src/lib/insight-gemini.ts`

Gemini takes the signal and user context, then generates natural language:

**Input to Gemini:**
```
User goal: Muscle Gain
Secondary focuses: Vegan
Meal: 650 cal, 12g P, 85g C, 28g F
Facts: lowProtein, highCarbs
```

**Gemini output:**
```
"High-carb meal — great as training fuel; balance with protein later"
```

**Critical prompting rules:**
1. Maximum 12-18 words
2. NEVER critique without acknowledging valid use case
3. Use conditional framing ("if X", "works when Y")
4. Anchor to user's goal
5. Avoid speculative or fringe nutrition claims

**Why Gemini, not hardcoded text:**
- Handles edge cases (vegan protein, leucine, etc.)
- Natural variation in phrasing
- Context-sensitive tone
- Future-proof for new goals/focuses

### Layer 4: UI Rendering

**Files:** `src/components/meal-card.tsx`, `src/components/home/DailyProgressCard.tsx`

The insight text is rendered in the appropriate component:
- Meal cards: Single line verdict under macros
- Daily progress: Sentence under calorie ring
- What-next hint: Subtle text below meal list

---

## Insight Generation

### Types of Insights

| Type | Trigger | Example |
|------|---------|---------|
| Meal Insight | Each logged meal with notable pattern | "High-carb meal — great as training fuel" |
| Daily Insight | Viewing daily progress | "Pacing light — room for a solid dinner" |
| What-Next Hint | Afternoon/evening with meals | "Protein-forward dinner would round this out" |

### When to Say Nothing

> **Most meals do not require commentary. Silence is a feature.**

Not every meal needs an insight. If the meal is balanced and on-track:
- No signal fires
- No insight generated
- UI shows nothing

This prevents:
- Insight fatigue
- Information overload
- "AI nagging" perception

### The Conditional Framing Pattern

The most important insight pattern:

**Wrong (absolute):**
> "Low protein, not optimal for muscle gain"

**Right (conditional):**
> "Light on protein — works if balancing later"

This pattern:
- Acknowledges the meal might be intentional
- Provides guidance without judgment
- Preserves user trust

### Signal Priority

Signals have priority levels that affect when insights appear:

| Priority | Behavior | Example |
|----------|----------|---------|
| High | Always show | Low protein + muscle gain goal |
| Medium | **Default to conditional framing** | High carbs (might be intentional) |
| Low | Often skip | Slightly above fat target |

**Key rule:** Medium-priority signals should always use conditional framing.

### API Flow

```
Component mounts
        ↓
Hook (useInsights.ts) calls API
        ↓
POST /api/insights with { signal, userContext }
        ↓
Server generates insight via Gemini
        ↓
Response cached (5 min TTL)
        ↓
Insight rendered in component
```

---

## UI Hierarchy

### Progressive Disclosure

The app follows strict information hierarchy:

| Layer | What Shows | Example |
|-------|------------|---------|
| Home screen | Verdict only | "High carbs, low protein" |
| Meal card | Verdict label | "Solid protein hit" |
| Meal detail | Explanation | Full nutrition breakdown |
| Edit/Reanalyze | Science | Confidence, assumptions, tips |

### Why This Matters

**Problem with showing everything:**
- Information overload
- Eye doesn't know where to rest
- Feels like a lecture

**Solution:**
- Say less by default
- Let users drill down for more
- Keep home screen calm and scannable

---

## Future: AI Supervisor (Phase 3)

Not yet implemented. Planned architecture:

### Purpose

A **reflective reviewer** that runs once daily (evening) to catch patterns the meal-level insights miss.

### What It Does

**Daily aggregation:**
- Summarize all meals and signals from the day
- Send to Gemini with longer context window

**Gemini reviews for:**
- Blind spots (insights that should have fired but didn't)
- Patterns over time (consistently low fiber, etc.)
- Priority mismatches (showing low-priority when high exists)

**Output:**
- 0-3 additional insights per day
- Shown as "coach notes" in evening
- Never repeats same-day meal guidance

### Critical Guardrails

**The supervisor should NOT:**
- Introduce new daily targets
- Repeat meal-level advice
- Override user preferences
- Contradict same-day insights

**The supervisor MAY:**
- Reframe patterns across meals
- Highlight week-level trends
- Stay completely silent (most days)

> **Silence is a valid output.** The supervisor should only speak when it adds clear value.

---

## Design Constraints

### Temporal Awareness (Future)

Currently: Insights consider time of day.

Future extensibility:
- Rest day vs. training day
- Pre/post workout meal context
- Weekly patterns

The architecture allows for this without major refactoring.

### Feedback Loops (Future)

At some point:
- Show users *how* insights adapt to their behavior
- "We noticed you often eat high-carb before training — we've adjusted"

This builds trust and transparency.

### Failure Modes (What The App Must Never Say)

To be defined in separate document. Key categories:
- Shaming language
- Absolute claims
- Medical advice
- Disorder-triggering phrases

---

## Summary

The app transforms raw nutrition data into intelligent, goal-aware guidance through:

1. **Onboarding** → Captures user context (goal, focuses, targets)
2. **Meal Logging** → Gemini Vision extracts nutrition from photos
3. **Signal Detection** → Rules engine identifies objective facts
4. **Gemini Phrasing** → Natural language with conditional framing
5. **Progressive UI** → Verdicts on surface, details on demand

The result: A calm, reflective nutrition intelligence system that respects user intent and explains tradeoffs rather than enforcing rules.
