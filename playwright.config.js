import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:true,
  workers:2,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:5174',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']}},
  webServer:{command:'npm run dev -- --port 5174 --strictPort',env:{VITE_SUPABASE_URL:'https://ptcare-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ptcare_mock_only'},url:'http://127.0.0.1:5174',reuseExistingServer:false,timeout:30000},
});
