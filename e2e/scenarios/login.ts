import { Page } from '@playwright/test';

export async function loginFlow(page: Page, email?: string, password?: string): Promise<boolean> {
    try {
        console.log('[Login] Navigating to sign-in page...');
        await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });

        // Wait for page to fully render
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });

        if (email && password) {
            console.log(`[Login] Logging in with credentials for ${email}`);

            // Use exact IDs from the signin page
            await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 });
            await page.locator('#email').fill(email);

            await page.locator('#password').fill(password);

            // Click the submit button
            await page.locator('button[type="submit"]').click();
        } else {
            console.log('[Login] Using Demo Mode...');

            // Click the exact "Try Demo Mode" button - identified from line 242
            const demoBtn = page.locator('button:has-text("Try Demo Mode")');
            await demoBtn.waitFor({ state: 'visible', timeout: 15000 });
            await demoBtn.click();
        }

        // Wait for navigation - demo mode goes to / then may redirect
        console.log('[Login] Waiting for navigation...');

        // Wait a bit for the auth to process
        await page.waitForTimeout(5000);

        // Check if we ended up on the home page or onboarding
        const currentUrl = page.url();
        console.log(`[Login] Current URL: ${currentUrl}`);

        // If we're NOT on signin, consider it a success
        if (!currentUrl.includes('/auth/signin')) {
            console.log('[Login] Successfully authenticated!');
            return true;
        }

        // If we're still on signin, try waiting a bit more
        try {
            await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), { timeout: 30000 });
            console.log('[Login] Successfully authenticated after wait!');
            return true;
        } catch {
            console.log('[Login] Still on signin page - auth may have failed');
            return false;
        }
    } catch (error) {
        console.error('[Login] Failed:', error);
        return false;
    }
}
