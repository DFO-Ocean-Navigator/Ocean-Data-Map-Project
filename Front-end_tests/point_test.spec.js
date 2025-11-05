import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

async function runPlotTest(page, dataset) {
  console.log(`Running test for dataset: ${dataset.name}`);

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

    // Open Edit Map Features
    await page.locator(".MapTools > button:nth-child(2)").click();
    await page.getByRole("button", { name: "Add New Feature" }).click();
    if (dataset.name=="CIOPS Forecast East 3D -"){
    await page.locator('[id="0"]').nth(3).fill(dataset.point_coordinates[0]);
    await page.locator('[id="0"]').nth(4).fill(dataset.point_coordinates[1]);
    }
    else{
    await page.locator('[id="0"]').first().fill(dataset.point_coordinates[0]);
    await page.locator('[id="0"]').nth(1).fill(dataset.point_coordinates[1]);
    }
    await page.getByRole("dialog").getByRole("checkbox").click();
 
    const profileRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/profile") &&
          url.includes("format=json") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );
    await page.getByRole("button", { name: "Plot Selected Features" }).click();
    if(dataset.type=="3D")
      {
    const profilePlotResponse = await profileRequestPromise;
    expect(profilePlotResponse.status()).toBe(200);
    }

    const timeseriesRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/timeseries") &&
          url.includes("format=json") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    await page.getByRole("button", { name: "Virtual Mooring" }).click();
    const virtualMooringplotResponse = await timeseriesRequestPromise;
    expect(virtualMooringplotResponse.status()).toBe(200);

    await page.getByRole("button", { name: "Save Image" }).click();

    //Listen for download request
    const downloadResponsePromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/timeseries") &&
          url.includes("save=True") &&
          url.includes("format=csv") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    //listening for download event
    const downloadEventPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "CSV", exact: true }).click();

    const [downloadResponse, download] = await Promise.all([
      downloadResponsePromise,
      downloadEventPromise,
    ]);
    //check if back-end sends data
    expect(downloadResponse.status()).toBe(200);

    // download object created, if browser begins downloading
    //giving a name to the file and ensuring download has started
    //Note: file created will not be stored in the system and automatically cleaned up after test finishes
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toBeTruthy();
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
