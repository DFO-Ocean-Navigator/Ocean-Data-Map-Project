import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";


async function runPlotTest(page, dataset) {
  console.log(`Running Variable test for dataset: ${dataset.name}`);

  // Go to main page
  await page.goto("https://142.130.125.45:8443/public/");
  // await page.goto("https://staging.oceannavigator.ca/public/");
  // Wait for data to load
  // await page
  //   .locator("img")
  //   .first()
  //   .waitFor({ state: "visible", timeout: 30000 });

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
  await expect(page.getByRole("button", { name: dataset.name }))
    .toBeVisible()
    .catch((err) => {
      throw new Error(`Dataset didn't get changed properly: ${err.message}`);
    });

  for (const variable_key in dataset.variables_to_test) {
    //select variable
    await page
      .getByLabel("Variable")
      .selectOption({ label: dataset.variables_to_test[variable_key] });
    const tileResponsePromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes(`/api/v2.0/tiles/${dataset.id}/${variable_key}`) &&
          url.includes(
            `${dataset.tile_coordinates[0]}/${dataset.tile_coordinates[1]}/${dataset.tile_coordinates[2]}`
          ) &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 } // wait up to 2 minutes
    );

    const scaleResponsePromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes(`api/v2.0/scale/${dataset.id}/${variable_key}`) &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    //click on go
    await page.getByRole("button", { name: "Go" }).click();

    const tileResponse = await tileResponsePromise;
    const scaleResponse = await scaleResponsePromise;

    //check response status
    try {
      expect(tileResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(
        `Map tiles for new variable didn't get generated: ${err.message}`
      );
    }

    //check scale response
    try {
      expect(scaleResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`variable scale didn't get generated: ${err.message}`);
    }

    await expect(page.getByLabel("Variable").locator("option:checked"))
      .toHaveText(dataset.variables_to_test[variable_key])
      .catch((err) => {
        throw new Error(
          `Variable in dataset selector didn't get changed: ${err.message}`
        );
      });
  }
  //****************************************************************END OF TEST**********************************************************************//
}

test("All datasets sequential test", async ({ page }) => {
  test.setTimeout(120000);

  const results = [];

  for (const dataset of datasets) {
    await test.step(`Testing dataset: ${dataset.name}`, async () => {
      try {
        await runPlotTest(page, dataset);
        results.push({ dataset: dataset.name, status: "passed" });
      } catch (err) {
        results.push({
          dataset: dataset.name,
          status: "failed",
          error: err.message,
        });
        console.error(`Error in dataset "${dataset.name}": ${err.message}`);
      }
    });
  }

  // Report summary at the end
  const failed = results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    console.log("\nTest Summary:");
    results.forEach((r) => {
      console.log(`${r.dataset}: ${r.status}`);
      if (r.error) console.log(`  Error: ${r.error}`);
    });
    throw new Error(
      `${failed.length} datasets failed out of ${results.length}`
    );
  }
});
