import { Page } from '@playwright/test';

/**
 * Onboarding flow - handles the multi-step onboarding process
 */
export async function onboardingFlow(page: Page): Promise<boolean> {
    try {
        const url = page.url();
        if (!url.includes('onboarding')) {
            console.log('[Onboarding] Not on onboarding page');
            return true;
        }

        console.log('[Onboarding] Starting onboarding flow...');
        const maxSteps = 10;

        for (let step = 0; step < maxSteps; step++) {
            await page.waitForTimeout(1000);

            // Check if we're done (redirected to dashboard)
            if (!page.url().includes('onboarding')) {
                console.log('[Onboarding] Completed!');
                return true;
            }

            console.log(`[Onboarding] Step ${step + 1}`);

            // Look for radio buttons or card selections
            const options = page.locator('button:not([type="submit"]):visible, [role="radio"], .card-option');
            const optionCount = await options.count();

            if (optionCount > 0) {
                const randomIndex = Math.floor(Math.random() * Math.min(optionCount, 4));
                try {
                    await options.nth(randomIndex).click();
                    console.log(`[Onboarding] Selected option ${randomIndex + 1}`);
                    await page.waitForTimeout(300);
                } catch { /* Option might not be clickable */ }
            }

            // Fill any number inputs (for weight, height, etc.)
            const numberInputs = page.locator('input[type="number"]');
            const inputCount = await numberInputs.count();
            if (inputCount > 0) {
                for (let i = 0; i < inputCount; i++) {
                    try {
                        await numberInputs.nth(i).fill('70');
                    } catch { /* Might not be visible */ }
                }
            }

            // Look for Continue/Next button
            const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Get Started"), button[type="submit"]').first();
            if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await continueBtn.click();
                console.log(`[Onboarding] Clicked continue`);
            }
        }

        return true;
    } catch (error) {
        console.error('[Onboarding] Flow failed:', error);
        return false;
    }
}
