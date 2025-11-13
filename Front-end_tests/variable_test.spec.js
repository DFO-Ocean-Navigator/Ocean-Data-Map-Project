import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

async function runPlotTest(page, dataset) {
  console.log(`Running Point test for dataset: ${dataset.name}`);

    // Go to main page
    await page.goto("http://0.0.0.0:8443/public/");
    // Wait for data to load
    await page
      .locator("img")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    // Steps to select dataset on dataset selector
    for (const step of dataset.steps) {
      await page.getByRole("button", { name: step }).click();
    }

    // Wait for data to load
    await page
      .locator("img")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    //apply dataset to the main map
    await page.getByRole("button", { name: "Go" }).click();

    //wait for dataset to be loaded fully
    await page
      .locator("img")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });
    
      //verify id dataset changed properly
    await expect(
      page.getByRole("button", { name: dataset.name })
    ).toBeVisible();

    const tileResponsePromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/tiles") &&
          url.includes("sspeed") &&
          url.includes(
            `${dataset.tile_coordinates[0]}/${dataset.tile_coordinates[1]}/${dataset.tile_coordinates[2]}`
          ) &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 } // wait up to 2 minutes
    );

    for (const variable of dataset.variables_to_test)
    //select variable
{    await page.getByLabel("Variable").selectOption({ label:variable });

    //click on go
    await page.getByRole("button", { name: "Go" }).click();

    await page.waitForTimeout(10000); // Waits for 2 seconds

    const tileresponse = await tileResponsePromise;


    //check response status
    expect(tileresponse.status()).toBe(200);

    //verify if variable changed properly
  await expect(page.getByLabel('Variable').locator('option:checked')).toHaveText(variable);

}}

//****************************************************************END OF TEST**********************************************************************//

for (const dataset of datasets) {
  test(`dataset: ${dataset.name}`, async ({ page }) => {
    // 2 minutes allocated per dataset
    test.setTimeout(120000);
    try {
      await runPlotTest(page, dataset);
    } catch (err) {
      console.error(`Error in dataset "${dataset.name}": ${err.message}`);
      throw err;
    }
  });
}
