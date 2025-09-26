﻿import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ja-JP',
    colorScheme: 'light',
  },
  webServer: {
    command: 'npm run start',
    port: 4173,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
