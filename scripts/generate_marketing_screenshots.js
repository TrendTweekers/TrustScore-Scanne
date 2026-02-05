import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// This script assumes the local server is running on localhost:3000
// It navigates to the app (simulated) and takes screenshots.
// Since we can't easily login to Shopify via Puppeteer without credentials, 
// this is a template script for the user to run or adapt.

// Ideally, we'd mock the frontend without auth for screenshotting, but let's assume
// the user runs this while their dev server is up and they have a way to access it.

// Alternatively, we can take screenshots of the components if we had Storybook, but we don't.

async function takeMarketingScreenshots() {
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  // Ensure directory exists
  const dir = './marketing/screenshots';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  try {
    // 1. Dashboard View
    // Note: This URL will likely redirect to Shopify login if not authenticated.
    // So this script is more of a placeholder for the user to customize with their actual tunnel URL + session token mechanism
    // or to run manually against a local bypass.
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait for content to load (this might fail if auth redirects)
    // For now, we'll just take a screenshot of whatever is there.
    await page.screenshot({ path: `${dir}/1_dashboard.png` });
    console.log('Saved 1_dashboard.png');

    // 2. Mobile View
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.screenshot({ path: `${dir}/2_mobile_dashboard.png` });
    console.log('Saved 2_mobile_dashboard.png');

  } catch (error) {
    console.error('Screenshot failed:', error);
  } finally {
    await browser.close();
  }
}

takeMarketingScreenshots();
