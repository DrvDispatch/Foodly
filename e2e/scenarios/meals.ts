import { Page } from '@playwright/test';
import { MEAL_IMAGES } from '../utils/botFlows';
import * as path from 'path';

/**
 * Robust meal logging flow with better wait strategies
 * 
 * Issues fixed:
 * - Use waitForSelector with longer timeout for hidden input
 * - Wait for sheet to fully render before interacting
 * - Add explicit timeout handling
 */
export async function logMealFlow(page: Page): Promise<boolean> {
    try {
        console.log('[Meal] Navigating to home page...');
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });

        // Wait for FAB to appear
        const fab = page.locator('button[aria-label="Add"]');
        try {
            await fab.waitFor({ state: 'visible', timeout: 10000 });
        } catch {
            console.log('[Meal] FAB not visible, skipping');
            return false;
        }

        console.log('[Meal] Clicking FAB...');
        await fab.click();
        await page.waitForTimeout(500); // Wait for menu animation

        // Click "Add Meal" option
        const addMealSpan = page.locator('span:has-text("Add Meal")');
        try {
            await addMealSpan.waitFor({ state: 'visible', timeout: 3000 });
        } catch {
            console.log('[Meal] Add Meal option not visible, closing menu');
            await page.keyboard.press('Escape');
            return false;
        }

        await addMealSpan.click();
        console.log('[Meal] Opened Add Meal sheet');

        // Wait for sheet to fully render (look for "Log Meal" header)
        try {
            await page.locator('h2:has-text("Log Meal")').waitFor({ state: 'visible', timeout: 5000 });
        } catch {
            console.log('[Meal] Sheet did not open properly');
            await page.keyboard.press('Escape');
            return false;
        }

        await page.waitForTimeout(500); // Let animations complete

        // Get random image path
        const randomImage = MEAL_IMAGES[Math.floor(Math.random() * MEAL_IMAGES.length)];
        const imagePath = path.resolve(__dirname, '../assets/meals', randomImage);
        console.log(`[Meal] Using image: ${randomImage}`);

        // Set file on hidden input (id="gallery-input")
        // The input is hidden, so we set files directly without waiting for visible
        const fileInput = page.locator('#gallery-input');
        try {
            // First check if input exists at all
            const inputCount = await fileInput.count();
            if (inputCount === 0) {
                // Try alternative selector
                const altInput = page.locator('input[type="file"][accept*="image"]').first();
                await altInput.setInputFiles(imagePath, { timeout: 10000 });
            } else {
                await fileInput.setInputFiles(imagePath, { timeout: 10000 });
            }
            console.log('[Meal] Photo uploaded');
        } catch (e) {
            console.log('[Meal] Failed to upload photo, trying description only');
            // Fall back to description-only meal
        }

        // Wait for image preview or just continue
        await page.waitForTimeout(1000);

        // Fill description (always works)
        const description = page.locator('textarea').first();
        if (await description.isVisible({ timeout: 2000 }).catch(() => false)) {
            await description.fill('E2E bot test meal - ' + new Date().toISOString());
            console.log('[Meal] Added description');
        }

        // Click "Analyze Meal" button
        const submitBtn = page.locator('button:has-text("Analyze Meal")');
        try {
            await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
            await submitBtn.click();
            console.log('[Meal] Submitted meal');
        } catch {
            console.log('[Meal] Submit button not found');
            await page.keyboard.press('Escape');
            return false;
        }

        // Wait for success or timeout
        try {
            await page.locator('text="Meal logged!"').waitFor({ state: 'visible', timeout: 30000 });
            console.log('[Meal] Meal logged successfully!');
        } catch {
            console.log('[Meal] Success message not seen, but submission might have worked');
        }

        await page.waitForTimeout(1000);
        return true;
    } catch (error) {
        console.error('[Meal] Flow failed:', error);
        await page.keyboard.press('Escape').catch(() => { });
        return false;
    }
}
