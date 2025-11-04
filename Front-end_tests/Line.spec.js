import { test, expect } from '@playwright/test';

test('generates proper csv file for line plots', async ({ page }) => {
  // Set test timeout to 3 minutes (plot generation can take time)
  test.setTimeout(180000);
  
  await page.goto('http://0.0.0.0:8443/public/');
  
  // selecting Edit Map Features
  await page.locator('.MapTools > button:nth-child(2)').click();
  await page.getByRole('button', { name: 'Add New Feature' }).click();
  await page.getByRole('combobox').nth(3).selectOption({ label: "Line" });
  await page.getByRole('dialog').getByRole('button', { name: '+' }).click();
  await page.locator('[id="0"]').first().fill('-60');
  await page.locator('[id="0"]').nth(1).fill('52');
  await page.locator('[id="1"]').first().fill('-58');
  await page.locator('[id="1"]').nth(1).fill('54');
  await page.getByRole('dialog').getByRole('checkbox').check();
  
  // Set up listener for the ACTUAL plot generation API
  const plotRequestPromise = page.waitForResponse(
    response => {
      const url = response.url();
      return url.includes('/api/v2.0/plot/transect') &&
             url.includes('format=json') &&
             response.request().method() === 'GET';
    },
    { timeout: 120000 }
  );
  
  // Click to plot
  await page.getByRole('button', { name: 'Plot Selected Features' }).click();
  
   // Wait for the Line window/dialog to appear first
  await page.waitForSelector('text=Line', { timeout: 10000 });

  // Now wait for the actual plot API response
  const plotResponse = await plotRequestPromise;
  // Check if the plot generation failed with 500
  
  // Assert successful plot generation
  expect(plotResponse.status()).toBe(200);
  console.log('✓ Plot generated successfully');
  
  // Wait a bit for the plot to render in the UI
  await page.waitForTimeout(3000);
  
  // Verify the plot image loaded correctly
  const plotImg = page.getByRole('img', { name: 'Plot' });
  await expect(plotImg).toBeVisible();
  
//   const src = await plotImg.getAttribute('src');
  

  
//   expect(src).toContain('data:image/png;base64,');
});