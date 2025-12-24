import { Page } from '@playwright/test';

/**
 * Robust weight logging flow with better wait strategies
 * 
 * Issues fixed:
 * - Wait for sheet header "Add Weight" to confirm sheet opened
 * - Use more specific selectors for weight input
 * - Add timeout handling
 */
export async function logWeightFlow(page: Page): Promise<boolean> {
    try {
        console.log('[Weight] Navigating to home page...');
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });

        // Wait for FAB
        const fab = page.locator('button[aria-label="Add"]');
        try {
            await fab.waitFor({ state: 'visible', timeout: 10000 });
        } catch {
            console.log('[Weight] FAB not visible');
            return false;
        }

        console.log('[Weight] Clicking FAB...');
        await fab.click();
        await page.waitForTimeout(500); // Wait for menu animation

        // Click "Add Weight" option
        const addWeightSpan = page.locator('span:has-text("Add Weight")');
        try {
            await addWeightSpan.waitFor({ state: 'visible', timeout: 3000 });
        } catch {
            console.log('[Weight] Add Weight option not visible');
            await page.keyboard.press('Escape');
            return false;
        }

        await addWeightSpan.click();
        console.log('[Weight] Opened Add Weight sheet');

        // Wait for sheet to fully render (look for "Add Weight" header with h2)
        try {
            await page.locator('h2:has-text("Add Weight")').waitFor({ state: 'visible', timeout: 5000 });
        } catch {
            console.log('[Weight] Sheet did not open properly');
            await page.keyboard.press('Escape');
            return false;
        }

        await page.waitForTimeout(500); // Let animations complete

        // Fill weight input - look for the large centered input
        const randomWeight = (65 + Math.random() * 20).toFixed(1);

        // The weight input is type="number" with step="0.1" and specific styling
        const weightInput = page.locator('input[type="number"][step="0.1"]');
        try {
            await weightInput.waitFor({ state: 'visible', timeout: 5000 });
            await weightInput.fill(randomWeight);
            console.log(`[Weight] Entered weight: ${randomWeight}kg`);
        } catch {
            // Try alternative: any number input in the sheet
            const altInput = page.locator('.rounded-t-3xl input[type="number"]').first();
            try {
                await altInput.waitFor({ state: 'visible', timeout: 3000 });
                await altInput.fill(randomWeight);
                console.log(`[Weight] Entered weight (alt): ${randomWeight}kg`);
            } catch {
                console.log('[Weight] Could not find weight input');
                await page.keyboard.press('Escape');
                return false;
            }
        }

        // Fill optional note
        const noteInput = page.locator('input[placeholder="Add a note (optional)"]');
        if (await noteInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await noteInput.fill('E2E bot entry');
            console.log('[Weight] Added note');
        }

        // Click "Save Weight" button
        const saveBtn = page.locator('button:has-text("Save Weight")');
        try {
            await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
            await saveBtn.click();
            console.log('[Weight] Saving weight...');
        } catch {
            console.log('[Weight] Save button not found');
            await page.keyboard.press('Escape');
            return false;
        }

        // Wait for sheet to close
        await page.waitForTimeout(1500);

        console.log('[Weight] Weight logged successfully!');
        return true;
    } catch (error) {
        console.error('[Weight] Flow failed:', error);
        await page.keyboard.press('Escape').catch(() => { });
        return false;
    }
}
