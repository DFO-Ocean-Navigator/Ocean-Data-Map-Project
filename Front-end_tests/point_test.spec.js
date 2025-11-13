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

  // Open Edit Map Features
  await page.locator(".MapTools > button:nth-child(2)").click();

  //click Add New Feature
  await page.getByRole("button", { name: "Add New Feature" }).click();

  //add coordinated for the datasets
  //the coordinate box position differs for CIOPS 3D only
  if (dataset.name == "CIOPS Forecast East 3D -") {
    await page.locator('[id="0"]').nth(3).fill(dataset.point_coordinates[0]);
    await page.locator('[id="0"]').nth(4).fill(dataset.point_coordinates[1]);
  } else {
    await page.locator('[id="0"]').first().fill(dataset.point_coordinates[0]);
    await page.locator('[id="0"]').nth(1).fill(dataset.point_coordinates[1]);
  }

  //click checkbox
  await page.getByRole("dialog").getByRole("checkbox").click();

  //listen for profile response
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

  //click on plot
  await page.getByRole("button", { name: "Plot Selected Features" }).click();

  //profile plot is only available for 3D dataset
  if (dataset.type == "3D") {
    //wait for the response
    const profilePlotResponse = await profileRequestPromise;
    //verify if plot is rendered
    expect(profilePlotResponse.status()).toBe(200);
  }

  //listen for hovmoller plot request
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

  //verify id dataset changed properly
  await expect(
    page.getByRole("button", { name: dataset.name }).nth(1)
  ).toBeVisible();

  //click on Virtual Mooring button
  await page.getByRole("button", { name: "Virtual Mooring" }).click();
  //wait for response
  const virtualMooringplotResponse = await timeseriesRequestPromise;
  //verify if plot is rendered
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
  //click on CSV file
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

  //*********************************************************************************************************
  //                                   API Script Download Test
  //*********************************************************************************************************

  //click on API
  await page.getByRole("button", { name: "API Script" }).click();

  //listener for api download
  const apiDownloadResponsePromise = page.waitForResponse(
    (response) => {
      const url = response.url();
      return (
        url.includes("/api/v2.0/generate_script") &&
        url.includes("script_type=csv") &&
        response.request().method() === "GET"
      );
    },
    { timeout: 120000 }
  );
  //listening for download event
  const apiDownloadEventPromise = page.waitForEvent("download");

  //click on csv
  await page
    .getByRole("button", { name: "Python 3 - CSV", exact: true })
    .click();

  //responses
  const [apiResponse, apidownload] = await Promise.all([
    apiDownloadResponsePromise,
    apiDownloadEventPromise,
  ]);

  //confirm if api responded with 200 status
  expect(apiResponse.status()).toBe(200);

  //giving a name to the file and ensuring download has started
  //Note: file created will not be stored in the system and automatically cleaned up after test finishes
  const suggestedApiFilename = apidownload.suggestedFilename();
  expect(suggestedApiFilename).toBeTruthy();
  console.log(`Test passed for: ${dataset.name}`);
}

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
