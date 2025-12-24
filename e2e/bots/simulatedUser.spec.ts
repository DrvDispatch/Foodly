import { test } from '@playwright/test';
import { loginFlow } from '../scenarios/login';
import { onboardingFlow } from '../scenarios/onboarding';
import { logMealFlow } from '../scenarios/meals';
import { logWeightFlow } from '../scenarios/weight';
import { coachChatFlow } from '../scenarios/coach';
import { calendarFilterFlow } from '../scenarios/calendar';
import { healthReportFlow } from '../scenarios/health';
import { profileEditFlow } from '../scenarios/profile';
import { getRandomAction, BotAction } from '../utils/botFlows';

// Configure 15 bot users
const BOTS = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    email: `bot${i + 1}@test.com`,
    password: 'test123',
}));

test.describe('E2E Bot Simulation - 15 Bots', () => {
    test.describe.configure({ mode: 'parallel' });

    // Set reasonable timeout per test (3 minutes)
    test.setTimeout(180000);

    for (const bot of BOTS) {
        test(`Bot ${bot.id} - Full User Journey`, async ({ page }) => {
            let successCount = 0;
            let totalActions = 0;

            console.log(`\n${'='.repeat(50)}`);
            console.log(`[Bot ${bot.id}] Starting session`);
            console.log(`${'='.repeat(50)}\n`);

            // Step 1: Login
            const loginSuccess = await loginFlow(page);
            if (!loginSuccess) {
                console.error(`[Bot ${bot.id}] Login failed`);
                return;
            }
            console.log(`[Bot ${bot.id}] ✓ Logged in`);

            // Step 2: Handle onboarding if needed
            if (page.url().includes('onboarding')) {
                await onboardingFlow(page);
                console.log(`[Bot ${bot.id}] ✓ Onboarding complete`);
            }

            // Step 3: Perform random actions (3-5 actions per bot)
            const iterations = 3 + Math.floor(Math.random() * 3);

            for (let i = 0; i < iterations; i++) {
                const action = getRandomAction();
                totalActions++;

                console.log(`[Bot ${bot.id}] Action ${i + 1}/${iterations}: ${action}`);

                let success = false;

                try {
                    switch (action) {
                        case 'LOG_MEAL':
                            success = await logMealFlow(page);
                            break;
                        case 'LOG_WEIGHT':
                            success = await logWeightFlow(page);
                            break;
                        case 'CHAT_COACH':
                            success = await coachChatFlow(page);
                            break;
                        case 'CHECK_CALENDAR':
                            success = await calendarFilterFlow(page);
                            break;
                        case 'CHECK_HEALTH':
                            success = await healthReportFlow(page);
                            break;
                        case 'EDIT_PROFILE':
                            success = await profileEditFlow(page);
                            break;
                        case 'VIEW_TIMELINE':
                            await page.goto('/timeline', { waitUntil: 'domcontentloaded', timeout: 15000 });
                            await page.waitForTimeout(1500);
                            success = true;
                            break;
                        case 'VIEW_TRENDS':
                            await page.goto('/trends', { waitUntil: 'domcontentloaded', timeout: 15000 });
                            await page.waitForTimeout(1500);
                            success = true;
                            break;
                        case 'BROWSE_SETTINGS':
                            await page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
                            await page.waitForTimeout(1500);
                            success = true;
                            break;
                        case 'IDLE':
                            await page.waitForTimeout(1500);
                            success = true;
                            break;
                        default:
                            await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
                            success = true;
                    }
                } catch (error) {
                    console.error(`[Bot ${bot.id}] ${action} error:`, (error as Error).message?.slice(0, 100));
                    success = false;
                }

                if (success) {
                    successCount++;
                    console.log(`[Bot ${bot.id}] ✓ ${action}`);
                } else {
                    console.log(`[Bot ${bot.id}] ✗ ${action}`);
                }

                // Brief pause between actions
                await page.waitForTimeout(500);
            }

            // Summary
            const rate = Math.round((successCount / totalActions) * 100);
            console.log(`\n${'='.repeat(50)}`);
            console.log(`[Bot ${bot.id}] Complete: ${successCount}/${totalActions} (${rate}%)`);
            console.log(`${'='.repeat(50)}\n`);
        });
    }
});
