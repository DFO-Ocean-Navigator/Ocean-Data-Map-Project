import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";
let page;
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
  console.log(`Running Point test for dataset: ${dataset.name}`);


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
    .waitFor({ state: "visible", timeout: 60000 });

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
    try {
      expect(profilePlotResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`profile plot didn't get generated: ${err.message}`);
    }
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
  await expect(page.getByRole("button", { name: dataset.name }).nth(1))
    .toBeVisible()
    .catch((err) => {
      throw new Error(`Dataset didn't get changed correctly: ${err.message}`);
    });

  //click on Virtual Mooring button
  await page.getByRole("button", { name: "Virtual Mooring" }).click();
  //wait for response
  const virtualMooringplotResponse = await timeseriesRequestPromise;
  //verify if plot is rendered
  try {
    expect(virtualMooringplotResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(
      `Virtual Mooring plot didn't get generated: ${err.message}`
    );
  }

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
  try {
    expect(downloadResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(`Back-end didn't send csv file: ${err.message}`);
  }

  // download object created, if browser begins downloading
  //giving a name to the file and ensuring download has started
  //Note: file created will not be stored in the system and automatically cleaned up after test finishes
  const suggestedFilename = download.suggestedFilename();
  try {
    expect(suggestedFilename).toBeTruthy();
  } catch (err) {
    throw new Error(`file didn't start downloading: ${err.message}`);
  }

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
  try {
    expect(apiResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(`api file not recieved : ${err.message}`);
  }

  //giving a name to the file and ensuring download has started
  //Note: file created will not be stored in the system and automatically cleaned up after test finishes
  const suggestedApiFilename = apidownload.suggestedFilename();
  try {
    expect(suggestedApiFilename).toBeTruthy();
  } catch (err) {
    throw new Error(`api file didn't start downloading: ${err.message}`);
  }

  //resetting ui for next dataset
  //close modal
  await page.getByRole("button", { name: "Close" }).nth(1).click();

  //reset to giops dataset
  if (dataset.id != "giops_day") {
    await page.getByRole("button", { name: dataset.steps.at(-1) }).click();
    await page
      .getByRole("button", { name: dataset.steps.at(-2), exact: true })
      .click();
    await page.getByRole("button", { name: "GIOPS Forecast" }).click();
    await page.getByRole("button", { name: "GIOPS 10 Day Daily Mean" }).click();
  }

  //reset map drawings
  await page.locator(".MapTools > button:nth-child(6)").click();
}

//****************************************************************END OF TEST**********************************************************************//

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
