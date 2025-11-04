import { test, expect } from '@playwright/test';

test('generates proper csv file for line plots', async ({ page }) => {
  // Set test timeout to 3 minutes (plot generation can take time)
  test.setTimeout(180000);
  
  await page.goto('https://www.oceannavigator.ca/public/');
  await page.getByRole('button', { name: 'GIOPS 10 Day Daily Mean' }).click();
  await page.getByRole('button', { name: 'SalishSeaCast' }).click();
  await page.getByRole('button', { name: 'SalishSeaCast 3D Currents'}).click();
  // await page.getByRole('button', { name: 'Copernicus Marine Service Global Ocean 1/12 deg Physics Reanalysis (Monthly)' })
  // await page.getByRole('button', { name: 'CIOPS Forecast East 3D -' }).click();
  await page.waitForTimeout(10000);
  await page.getByRole('button', { name: 'Go' }).click();
  await page.waitForTimeout(10000);
  await page.locator('.MapTools > button:nth-child(2)').click();
  await page.getByRole('button', { name: 'Add New Feature' }).click();
  await page.getByRole('combobox').nth(3).selectOption({label:'Area'});
  await page.getByRole('dialog').getByRole('button', { name: '+' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '+' }).click();
  await page.locator('[id="0"]').first().fill('-123.68');
  await page.locator('[id="1"]').first().fill('-123.3265');
  await page.locator('[id="2"]').first().fill('-123.4583');
  await page.locator('[id="0"]').nth(1).fill('49.3144');
  await page.locator('[id="1"]').nth(1).fill('49.2905');
  await page.locator('[id="2"]').nth(1).fill('49.0367');
  await page.getByRole('dialog').getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Plot Selected Features' }).click();
    await page.waitForTimeout(10000);
    await expect(
  page.locator('#left_map').getByRole('button', { name: 'SalishSeaCast 3D Currents' })
).toBeVisible();

    await page.getByRole('listbox').selectOption({option:'Speed of Current'});
      await page.getByRole('checkbox', { name: 'Compress as *.zip' }).click();
     const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const download = await downloadPromise;

  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toBeTruthy();

    //testing for subset netcdf4 file download

    //selecting subset variable
    // await page.getByRole("listbox").selectOption({ label: dataset.subset_var });
    // //compressing as zip file
    // await page.getByRole("checkbox", { name: "Compress as *.zip" }).click();
    // //listening for download event
    // const downloadPromise = page.waitForEvent("download");
    // //clicking save file, should start downlaod
    // await page.getByRole("button", { name: "Save", exact: true }).click();
    //check if any error ocurred while downloading the file
    // if (consoleErrors.length > 0) {
    //   throw new Error(
    //     `Captured console errors for dataset "${
    //       dataset.name
    //     }":\n- ${consoleErrors.join("\n- ")}`
    //   );
    // }
    //download object created, if browser begins downloading
    // const download = await downloadPromise;
    // //giving a name to the file and ensuring download has started
    // //Note: file created will not be stored in the system and automatically cleaned up after test finishes
    // const suggestedFilename = download.suggestedFilename();
    // expect(suggestedFilename).toBeTruthy();



 
  






})
