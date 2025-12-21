# Nutri AI Insights System

A detailed overview of how the app interprets nutrition data into intelligent, goal-aware coaching.

---

## The Core Philosophy: Rules × Gemini

We use a hybrid architecture to ensure insights are both **accurate** and **human**.

1.  **Rules (Deterministic)**: A TypeScript rules engine detects objective facts (e.g., "Protein < 15%"). This prevents AI hallucinations about data.
2.  **Gemini (Nuanced)**: Gemini takes these facts and phrases them naturally. This adds context, acknowledges user intent, and avoids a "robotic" feel.

---

## Insight Variants

We generate **5 types** of insights across **2 levels of detail**.

### Level 1: Brief (10-15 words)
*Goal: Fast scannability on main screens.*

| Type | Location | Purpose |
| :--- | :--- | :--- |
| **Meal Brief** | Home Screen & Meal Card | Immediate verdict on a specific meal. |
| **Daily Brief** | Home Screen Progress Card | Pulse-check on how the entire day is pacing. |
| **What-Next Hint** | Home Screen Bottom | A gentle "whisper" suggesting the next best move. |

### Level 2: Detailed (2-3 sentences)
*Goal: Deep context and education when the user taps in.*

| Type | Location | Purpose |
| :--- | :--- | :--- |
| **Meal Detailed** | Meal Detail Page | Explains tradeoffs (e.g., pre-workout fuel vs. protein goals). |
| **Daily Detailed** | Nutrition Modal | Synthesizes the day's patterns and provides actionable advice. |

---

## The 4-Layer Intelligence Stack

### Layer 1: Raw Data
The foundation is the raw numbers extracted from photos or text:
*   Calories: 1,100
*   Macros: 22g P, 149g C, 48g F

### Layer 2: Signal Detection (Rules Engine)
**File:** `src/lib/insights.ts`  
The rules engine converts data into **Lossy Signals**. It identifies objective nutritional facts without attached language.
*   **Facts Detected**: `lowProtein`, `highCarbs`, `substantialMeal`
*   **Why?**: Ensures consistency. "Low protein" is defined once in code, not left to AI interpretation.

### Layer 3: Gemini Phrasing (Natural Language)
**File:** `src/lib/insight-gemini.ts`  
Gemini receives the **Signal** + **User Context** (Goal, Focuses, Metrics).
*   **Example Prompt**: "User wants Muscle Gain. Facts: lowProtein, highCarbs. Give 10-15 words."
*   **Result**: "High-carb focus, great for pre-workout fuel. Prioritize protein in your next meal."

### Layer 4: Progressive UI Rendering
Insights are rendered based on the user's depth of interaction.
*   **Surface**: One-line verdicts.
*   **Deep**: 2-3 sentence explanations.

---

## Critical System Constraints

### 1. The Today-Only Rule
Insights are **only generated for the current day**.
*   **Past Days**: Data is history. We don't give "next steps" for a day that is finished.
*   **Future Days**: Too speculative.
*   **Benefit**: Massive API cost savings and zero confusion for the user.

### 2. No Data Repetition
Prompts strictly forbid quoting percentages or numbers back to the user (e.g., "Calories are at 30%").
*   **Why**: The UI already shows the numbers. The AI's job is to **interpret**, not repeat.
*   **Rule**: Describe qualitatively ("Pacing light"), not quantitatively ("1,100 calories used").

### 3. Conditional Framing (The "Pre-workout" Rule)
The system never assumes a meal is "bad." It acknowledges valid use cases:
*   Instead of: "Too many carbs."
*   We say: "High carb focus, potentially good pre-workout; balance with protein later."

### 4. Silence is a Feature
If a meal or day is perfectly balanced and on-track, the system may fire **no signal**. In this case, the UI stays clean and says nothing. We only speak when we add value.

---

## Performance & Cost Optimization

To minimize Gemini API calls and latency:

1.  **Stability-Based Caching**: The cache key contains the actual macro values + the date. If the numbers don't change, we never hit the API.
2.  **30-Minute TTL**: Insights are cached for 30 minutes on both client and server.
3.  **Ref Skipping**: React hooks use `useRef` to track the last fetched key. If the user navigates away and back to the same day, no network request is made.
4.  **Batching**: On the home screen, insights for all visible meals are fetched in a single parallel sweep.

---

## Logic Summary

| Step | Component | Action |
| :--- | :--- | :--- |
| **1** | `MealCard` / `Modal` | Component triggers Hook with daily/meal data. |
| **2** | `useInsights` Hook | Checks if date is Today. Checks Cache. |
| **3** | `insight-gemini.ts` | Builds prompt with detected signals + goal context. |
| **4** | **Gemini AI** | Returns 10-word or 2-sentence response (no numbers). |
| **5** | `clientCache` | Stores result for 30 minutes to save cost. |
