import { Page } from '@playwright/test';
import { CALENDAR_QUERIES } from '../utils/botFlows';

/**
 * Robust calendar navigation and AI filter flow
 */
export async function calendarFilterFlow(page: Page): Promise<boolean> {
    try {
        await page.goto('/calendar', { waitUntil: 'networkidle' });

        // Wait for calendar to load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Look for AI filter button
        const filterBtnSelectors = [
            'button:has-text("Ask AI")',
            'button:has-text("Filter")',
            'button:has-text("AI")',
            '[data-testid="ai-filter"]'
        ];

        let btnClicked = false;
        for (const selector of filterBtnSelectors) {
            try {
                const btn = page.locator(selector).first();
                if (await btn.isVisible({ timeout: 3000 })) {
                    await btn.click();
                    btnClicked = true;
                    break;
                }
            } catch { /* Try next */ }
        }

        if (!btnClicked) {
            console.log('[Calendar] AI filter button not found, just browsing');
            // Just navigate around
            const prevBtn = page.locator('button:has-text("Previous"), button[aria-label*="prev"]').first();
            if (await prevBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await prevBtn.click();
                await page.waitForTimeout(1000);
            }
            return true;
        }

        // Wait for filter sheet
        await page.waitForTimeout(500);

        // Type a query
        const query = CALENDAR_QUERIES[Math.floor(Math.random() * CALENDAR_QUERIES.length)];
        const input = page.locator('input[type="text"], textarea').first();

        if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            await input.fill(query);
            console.log(`[Calendar] Filtering with: "${query}"`);
            await page.keyboard.press('Enter');

            // Wait for results
            await page.waitForTimeout(5000);
        }

        // Close the sheet
        await page.keyboard.press('Escape');

        return true;
    } catch (error) {
        console.error('[Calendar] Flow failed:', error);
        return false;
    }
}
