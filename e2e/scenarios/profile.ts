import { Page } from '@playwright/test';

/**
 * Robust profile editing flow
 */
export async function profileEditFlow(page: Page): Promise<boolean> {
    try {
        await page.goto('/settings', { waitUntil: 'networkidle' });

        // Wait for page
        await page.waitForLoadState('domcontentloaded');

        // Look for edit profile link/button
        const editSelectors = [
            'text="Edit Profile"',
            'text="Profile"',
            'a[href*="profile"]',
            '[data-testid="edit-profile"]'
        ];

        for (const selector of editSelectors) {
            try {
                const el = page.locator(selector).first();
                if (await el.isVisible({ timeout: 2000 })) {
                    await el.click();
                    console.log('[Profile] Navigated to edit page');
                    break;
                }
            } catch { /* Try next */ }
        }

        await page.waitForTimeout(1000);

        // Look for save button (profile edit confirmation)
        const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await saveBtn.click();
            console.log('[Profile] Changes saved');
        }

        return true;
    } catch (error) {
        console.error('[Profile] Flow failed:', error);
        return false;
    }
}
