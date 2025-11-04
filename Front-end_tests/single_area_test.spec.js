import { test, expect } from '@playwright/test';

test('generates proper csv file for area plots', async ({ page }) => {
  // Set test timeout to 3 minutes (plot generation can take time)
  test.setTimeout(180000);
  
  await page.goto('http://0.0.0.0:8443/public/');
  await page.locator('img').first().waitFor({ state: 'visible', timeout: 30000 });


    await page.getByRole('button', { name: 'GIOPS 10 Day Daily Mean' }).click();
    await page.getByRole('button', { name: 'RIOPS Forecast' }).click();
  await page.getByRole('button', { name: 'CCG RIOPS Forecast Surface -' }).click();
  await page.getByRole('button', { name: 'Go' }).click();
  await page.waitForTimeout(10000);

  // selecting Edit Map Features
  await page.locator('.MapTools > button:nth-child(2)').click();
  
  // setting upload type to area before uploading csv file
  await page.getByRole('dialog').getByRole('combobox').selectOption({ label: 'Area' });

  // Setting up file chooser listener BEFORE clicking the upload button
  const fileChooserPromise = page.waitForEvent('filechooser');
  
  // Click on upload CSV
  await page.getByRole('button', { name: 'Upload CSV' }).click();
  
  // Waiting for the file chooser to appear
  const fileChooser = await fileChooserPromise;
  
  // Uploading the file
  await fileChooser.setFiles('/home/ubuntu/onav-cloud/Ocean-Data-Map-Project/Front-end_tests/Total Area NA 3.csv');
  
  // Waiting a moment for the file to be processed
  await page.waitForTimeout(2000);
  
  // selecting the uploaded coordinates/feature
  await page.getByRole('dialog').getByRole('checkbox').check();

  //listener for the plot generation API response
  const plotRequestPromise = page.waitForResponse(
    response => {
      const url = response.url();
      return url.includes('/api/v2.0/plot/map') &&
             url.includes('format=json') &&
             response.request().method() === 'GET';
    },
    { timeout: 120000 }
  );
  
  // plotting the selected feature
  await page.getByRole('button', { name: 'Plot Selected Features' }).click();
  

  // Wait for the Area window to appear
  await page.waitForSelector('text=Area - 4 Vertices', { timeout: 10000 });

  // Now waiting for the actual plot API response
  const plotResponse = await plotRequestPromise;

  // Assert successful plot generation
  expect(plotResponse.status()).toBe(200);

  //selecting water variable in the Arrows section
  await page.getByRole('combobox').nth(2).selectOption({ label: 'Water Velocity' })
  await page.waitForTimeout(10000);

  const plotImg = page.getByRole('img', { name: 'Plot' });
  const src = await plotImg.getAttribute('src');
  //assertion to check if the src points to sad-computer.png
  //A final check to see if plot is being displayed or not
  expect(src).toContain('data:image/png;base64,');


  //Subset NETCDF test

  //change variable to speed of sound
  await page.getByRole('listbox').selectOption({label: 'Potential Temperature'})

  //Zip file
  await page.getByRole('checkbox', { name: 'Compress as *.zip' }).click();

  //listening for download event
  const downloadPromise = page.waitForEvent('download');

  //clicking save file, should start downlaod
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  //download object created, if browser begins downloading
  const download = await downloadPromise;
 //giving a name to the file and ensuring download has started
 //Note: file created will not be stored in the system and automatically cleaned up after test finishes
  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toBeTruthy();

 //close the page
  await page.getByRole('button', { name: 'Close' }).nth(1).click();
  await page.waitForTimeout(5000);


  
});