import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e/bots',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 10, // 10 bots locally
    reporter: 'html',
    timeout: 10 * 60 * 1000, // 10 minutes per test to allow for long-running simulation
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
