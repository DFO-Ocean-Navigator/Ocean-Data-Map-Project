import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

test.use({ viewport: { width: 1920, height: 1080 } });
let page;

// test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ browser }) => {
  // Create one page globally
  page = await browser.newPage();

  // Only ONE navigation for all datasets
  await page.goto("http://0.0.0.0:8443/public/");

  // Wait for loading bar to be completed
  await page.locator(".progress").waitFor({ state: "detached" });
});

test.afterAll(async () => {
  await page.close();
});

async function runPlotTest(dataset) {
  console.log(`Running Variable test for dataset: ${dataset.name}`);

  // Steps to select dataset on dataset selector
  for (const step of dataset.steps) {
    await page.getByRole("button", { name: step }).click();
  }

  // Wait for progress bar to detach
  await page.locator(".progress").waitFor({ state: "detached" });

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

  //reset to giops dataset
  if (dataset.id != "giops_day") {
    await page.getByRole("button", { name: dataset.steps.at(-1) }).click();
    await page
      .getByRole("button", { name: dataset.steps.at(-2), exact: true })
      .click();
    await page.getByRole("button", { name: "GIOPS Forecast" }).click();
    await page.getByRole("button", { name: "GIOPS 10 Day Daily Mean" }).click();
  }

  //****************************************************************END OF TEST**********************************************************************//
}

test("All datasets sequential test", async () => {
  test.setTimeout(600000);

  const results = [];

  for (const dataset of datasets) {
    await test.step(`Testing dataset: ${dataset.name}`, async () => {
      try {
        await runPlotTest(dataset);
        results.push({ dataset: dataset.name, status: "passed" });
      } catch (err) {
        results.push({
          dataset: dataset.name,
          status: "failed",
          error: err.message,
        });
        console.error(`❌ Error in dataset "${dataset.name}": ${err.message}`);
        // Reload the app so next dataset runs cleanly
        console.log(`Reloading page after failure in ${dataset.name}...`);

        //doing a hard reload
        await page.reload({ waitUntil: "domcontentloaded" });

        // Wait for loading bar to be completed
        await page.locator(".progress").waitFor({ state: "detached" });

        //verifying if the reloaded page points to the home page
        //some errors might display the api response and relaoding the page just reloads the response
        const current = page.url();
        const target = "http://0.0.0.0:8443/public/";

        if (current !== target) {
          await page.goto(target, { waitUntil: "domcontentloaded" });
        }
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
