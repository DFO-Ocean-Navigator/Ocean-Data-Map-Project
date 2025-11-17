import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

async function runPlotTest(page, dataset) {
  console.log(`Running Line test for dataset: ${dataset.name}`);

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

  //For dataset that don't have data for flemish cap line
  if (dataset.line_coordinates != "flemish_cap") {
    //manually add coordinates
    await page.locator(".MapTools > button:nth-child(2)").click();
    await page.getByRole("button", { name: "Add New Feature" }).click();
    await page.getByRole("combobox").nth(3).selectOption({ label: "Line" });
    await page.getByRole("dialog").getByRole("button", { name: "+" }).click();
    await page.locator('[id="0"]').first().fill(dataset.line_coordinates[0]);
    await page.locator('[id="1"]').first().fill(dataset.line_coordinates[2]);
    await page.locator('[id="0"]').nth(1).fill(dataset.line_coordinates[1]);
    await page.locator('[id="1"]').nth(1).fill(dataset.line_coordinates[3]);
    await page.getByRole("dialog").getByRole("checkbox").click();

    //listen for plot request
    const plotRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/transect") &&
          url.includes("format=json") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );
    await page.getByRole("button", { name: "Plot Selected Features" }).click();

    const plotResponse = await plotRequestPromise;
    try {
      expect(plotResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`Line plot didn't get generated: ${err.message}`);
    }
  } else {
    //click on preset features
    await page.locator(".MapTools > button:nth-child(3)").click();

    //wait for it to be visible
    await page
      .getByRole("button", { name: "AZMP Transects", exact: true })
      .waitFor({ state: "visible", timeout: 120000 });

    // Listen for AZMP request
    const azmpRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/kml/line/AZMP") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    //click on AZMP Transects
    await page
      .getByRole("button", { name: "AZMP Transects", exact: true })
      .click();

    const azmpResponse = await azmpRequestPromise;

    try {
      expect(azmpResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`transect line didn't get generated: ${err.message}`);
    }

    // Open Edit Map Features
    await page.locator(".MapTools > button:nth-child(2)").click();

    //select flemish cap
    await page.getByRole("checkbox").nth(4).check();

    if (dataset.line_transect == "no") {
      // if dataset doesnt support line transect then hit plot and then go to hovmoller
      await page
        .getByRole("button", { name: "Plot Selected Features" })
        .click();
    } else {
      //listen for plot request
      const transectPlotRequestPromise = page.waitForResponse(
        (response) => {
          const url = response.url();
          return (
            url.includes("/api/v2.0/plot/transect") &&
            url.includes("format=json") &&
            response.request().method() === "GET"
          );
        },
        { timeout: 120000 }
      );

      // Plot
      await page
        .getByRole("button", { name: "Plot Selected Features" })
        .click();

      // Check API response
      //this check confirms if plot is being sent correctly from the back-end
      const transectPlotResponse = await transectPlotRequestPromise;
      try {
        expect(transectPlotResponse.status()).toBe(200);
      } catch (err) {
        throw new Error(`Transect Line didn't get generated: ${err.message}`);
      }

      //test to see if dataset was correctly changed in dataset_selector\
      await expect(
        page.locator("#left_map").getByRole("button", { name: dataset.name })
      )
        .toBeVisible()
        .catch((err) => {
          throw new Error(
            `Dataset didn't get changed correctly: ${err.message}`
          );
        });
    }
  }

  //***********************************************************************************************
  //                                   Hovmoller Diagram test
  //***********************************************************************************************
  // Listen for plot request
  const hovmollerPlotRequestPromise = page.waitForResponse(
    (response) => {
      const url = response.url();
      return (
        url.includes("/api/v2.0/plot/hovmoller") &&
        url.includes("format=json") &&
        response.request().method() === "GET"
      );
    },
    { timeout: 120000 }
  );

  //click on Hovmoller Diagram
  await page.getByRole("button", { name: "Hovmöller Diagram" }).click();

  //wait for response
  const hovmollerPlotResponse = await hovmollerPlotRequestPromise;

  //check status of response

  try {
    expect(hovmollerPlotResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(`Hovmoller plot didn't get generated: ${err.message}`);
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
