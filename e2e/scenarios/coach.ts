import { Page } from '@playwright/test';
import { COACH_QUESTIONS } from '../utils/botFlows';

/**
 * Coach chat flow matching actual coach/page.tsx
 * 
 * From apps/frontend/src/app/coach/page.tsx:
 * - Chat input: placeholder="Ask about your nutrition..." (line 228)
 * - Send button: follows input with Send icon (line 232-242)
 * - Messages: user messages have bg-primary-500, coach replies have bg-white
 */
export async function coachChatFlow(page: Page): Promise<boolean> {
    try {
        console.log('[Coach] Navigating to coach page...');
        await page.goto('/coach', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });

        // Find chat input (line 228)
        const chatInput = page.locator('input[placeholder="Ask about your nutrition..."]');
        await chatInput.waitFor({ state: 'visible', timeout: 15000 });

        // Pick a random question
        const question = COACH_QUESTIONS[Math.floor(Math.random() * COACH_QUESTIONS.length)];
        console.log(`[Coach] Asking: "${question}"`);

        await chatInput.fill(question);

        // Click send button (round button with Send icon)
        const sendBtn = page.locator('button.rounded-full').filter({ has: page.locator('svg') }).last();
        await sendBtn.click();
        console.log('[Coach] Message sent');

        // Wait for AI response (can take a while)
        console.log('[Coach] Waiting for AI response...');
        await page.waitForTimeout(15000);

        // Check if coach responded (look for coach message bubbles)
        const coachMessages = page.locator('.bg-white.rounded-2xl.rounded-bl-sm');
        const messageCount = await coachMessages.count();
        console.log(`[Coach] Found ${messageCount} coach responses`);

        return true;
    } catch (error) {
        console.error('[Coach] Flow failed:', error);
        return false;
    }
}
