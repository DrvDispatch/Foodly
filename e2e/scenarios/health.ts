import { Page } from '@playwright/test';

/**
 * Robust health report viewing flow
 */
export async function healthReportFlow(page: Page): Promise<boolean> {
    try {
        await page.goto('/health', { waitUntil: 'networkidle' });

        // Wait for content to load
        await page.waitForLoadState('domcontentloaded');

        // Look for any health-related content
        const contentLoaded = await page.locator('h1, h2, .card, [data-testid]').first().isVisible({ timeout: 10000 }).catch(() => false);

        if (contentLoaded) {
            console.log('[Health] Page loaded successfully');

            // Scroll around to trigger lazy loading
            await page.evaluate(() => window.scrollTo(0, 500));
            await page.waitForTimeout(1000);
            await page.evaluate(() => window.scrollTo(0, 0));

            return true;
        }

        console.log('[Health] Content did not load');
        return false;
    } catch (error) {
        console.error('[Health] Flow failed:', error);
        return false;
    }
}
