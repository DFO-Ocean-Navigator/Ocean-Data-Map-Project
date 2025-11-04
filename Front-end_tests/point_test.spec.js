import { test, expect } from "@playwright/test";
import datasets from './test_datasets.json';

async function runPlotTest(page, dataset) {
  console.log(`Running test for dataset: ${dataset.name}`);

  const consoleErrors = [];
  const consoleListener = (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
      console.error(`Loading Dataset Error: ${msg.text()}`);
    }
  };
  page.on("console", consoleListener);

  try {
    // Go to main page
    await page.goto("http://0.0.0.0:8443/public/");
        // Wait for data to load
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 30000 });


    // Steps to select dataset on dataset selector
    for (const step of dataset.steps) {
      await page.getByRole("button", { name: step }).click();
    }

    // Wait for data to load
    await page.locator('img').first().waitFor({ state: 'visible', timeout: 30000 });

    //applying dataset to the main map
    await page.getByRole("button", { name: "Go" }).click();

    //waiting for dataset to be loaded fully
   await page.locator('img').first().waitFor({ state: 'visible', timeout: 30000 });

    // check if there is any console errors after loading the dataset
    if (consoleErrors.length > 0) {
      throw new Error(
        `console errors":\n- ${consoleErrors.join("\n- ")}`
      );
    }
    // Open Edit Map Features
    await page.locator(".MapTools > button:nth-child(2)").click();
    await page.getByRole('button', { name: 'Add New Feature' }).click();
    await page.locator('[id="0"]').first().fill(dataset.point_coordinates[0]);
    await page.locator('[id="0"]').nth(1).fill(dataset.point_coordinates[1]);
    await page.getByRole('dialog').getByRole('checkbox').click();
        const plotRequestPromise = page.waitForResponse(
        (response)=>{
            const url = response.url();
            return(
                url.includes("/api/v2.0/plot/profile")&&
                url.includes('format=json')&&
                response.request().method() === "GET"
            );
        },
        {timeout: 120000}
    );
    await page.getByRole('button', { name: 'Plot Selected Features' }).click();

    const plotResponse= await plotRequestPromise;
    expect(plotResponse.status()).toBe(200);
    await page.getByRole('button', { name: 'Virtual Mooring' }).click()




  }
  finally{
    page.off("console", consoleListener);
  }
}

for (const dataset of datasets) {

  test(`dataset: ${dataset.name}`, async ({ page }) => {
    // 4 minutes allocated per dataset
    test.setTimeout(240000); 
    try {
      await runPlotTest(page, dataset);
    } catch (err) {
      console.error(`Error in dataset "${dataset.name}": ${err.message}`);
      throw err; 
    }
  });
}