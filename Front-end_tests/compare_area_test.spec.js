import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

//catches first successful response with a status of 200
//if no successful response within 120 second it will throw an error
async function waitForSuccessfulResponse(page, matchFn, timeout = 120000) {
  return await page.waitForResponse(
    (response) => {
      try {
        if (!matchFn(response)) return false;
        const status = response.status();
        return status == 200;
      } catch (e) {
        return false;
      }
    },
    { timeout }
  );
}
//Handles area plot compare mode
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

    //applying dataset to the main map
    await page.getByRole("button", { name: "Go" }).click();

    //waiting for dataset to be loaded fully
    await page
      .locator("img")
      .first()
      .waitFor({ state: "visible", timeout: 30000 });

    //checking for errors while loading dataset
    if (consoleErrors.length > 0) {
      throw new Error(
        `Captured console errors for dataset "${
          dataset.name
        }":\n- ${consoleErrors.join("\n- ")}`
      );
    }

    // Open Edit Map Features
    await page.locator(".MapTools > button:nth-child(2)").click();

    // choosing area as upload type
    //label position varies for SalishSeaCAst 3D Currents but same for the rest
    if (dataset.name == "SalishSeaCast 3D Currents") {
      await page.getByRole("combobox").nth(3).selectOption({ label: "Area" });
    } else {
      await page
        .getByRole("dialog")
        .getByRole("combobox")
        .selectOption({ label: "Area" });
    }

    // Uploading CSV file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload CSV" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(dataset.csvPath);
    await page.waitForTimeout(2000);

    // Select checkbox
    await page.getByRole("dialog").getByRole("checkbox").check();

    // Plot
    await page.getByRole("button", { name: "Plot Selected Features" }).click();

    //clciking on compare Dataset
    await page.locator("#dataset_compare").check();

    //By default every dataset is compared with GIOPS 10 Day Daily Mean
    //if we want to compare with other dataset
    if (dataset.compare_dataset != "GIOPS 10 Day Daily Mean") {

      //changing the dataset on the right side of the map
      await page
        .locator("#right_map")
        .getByRole("button", { name: "GIOPS 10 Day Daily Mean" })
        .click();

      for (const step of dataset.compare_steps) {
        await page.getByRole("button", { name: step }).click();
      }
      //wait for the dataset to be loaded properly
      const loadingDialog = page
        .getByRole("dialog")
        .filter({ hasText: "Loading RIOPS Forecast 3D - Polar Stereographic" });

      await loadingDialog.waitFor({ state: "detached", timeout: 120000 });

      // catches the successfull response for the new compare dataset
      //Note: When we compare with a dataset, the first api response we get gives a status 500 error
      //therefore waitForSuccessfulResponse function ensures that we only take the response that have a status 200.
      const [comparePlotResponse] = await Promise.all([
        waitForSuccessfulResponse(
          page,
          (res) =>
            res.url().includes("/api/v2.0/plot/map") &&
            res.url().includes("compare_to") &&
            res.request().method() === "GET",
          120000
        ),

        page.locator("#right_map").getByRole("button", { name: "Go" }).click(),

      ]);

      expect(comparePlotResponse.status()).toBe(200);

    } else {

      // Wait for the successful response
      const [datasetCompareResponse] = await Promise.all([
        waitForSuccessfulResponse(
          page,
          (res) =>
            res.url().includes("/api/v2.0/plot/map") &&
            res.url().includes("compare_to") &&
            res.request().method() === "GET",
          120000
        ),

        page.locator("#dataset_compare").check(),

      ]);

      expect(datasetCompareResponse.status()).toBe(200);
    }

  } finally {
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
