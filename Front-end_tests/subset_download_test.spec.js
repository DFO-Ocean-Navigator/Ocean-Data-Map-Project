import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

let page;
// test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ browser }) => {
  // Create one page globally
  page = await browser.newPage();

  // 🌟 Only ONE navigation for all datasets
  await page.goto("http://0.0.0.0:8443/public/");

  // Wait for progress bar to detach
  await page.locator(".progress").waitFor({ state: "detached" });
});
test.afterAll(async () => {
  await page.close();
});

// handles subset download
async function runPlotTest(dataset) {
  console.log(`Running subset download test for dataset: ${dataset.name}`);

  // Steps to select dataset on dataset selector
  for (const step of dataset.steps) {
    await page.getByRole("button", { name: step }).click();
  }

  // Wait for progress bar to detach
  await page.locator(".progress").waitFor({ state: "detached" });

  //applying dataset to the main map
  await page.getByRole("button", { name: "Go" }).click();

  //waiting for dataset to be loaded fully
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

  // selecting subset variable
  await page.getByRole("listbox").selectOption({ label: dataset.subset_var });

  //compressing as zip file
  await page.getByRole("checkbox", { name: "Compress as *.zip" }).click();

  //Listen for download request
  const downloadRequestPromise = page.waitForResponse(
    (response) => {
      const url = response.url();
      return (
        url.includes("/api/v2.0/subset") &&
        response.request().method() === "GET"
      );
    },
    { timeout: 90000 }
  );

  //listening for download event
  const downloadPromise = page.waitForEvent("download");

  //clicking save file, should start downlaod
  await page.getByRole("button", { name: "Save", exact: true }).click();

  //check if back-end sends data
  const downloadResponse = await downloadRequestPromise;
  try {
    expect(downloadResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(`Didn't recieve download file: ${err.message}`);
  }

  // download object created, if browser begins downloading
  const download = await downloadPromise;
  //giving a name to the file and ensuring download has started
  //Note: file created will not be stored in the system and automatically cleaned up after test finishes
  const suggestedFilename = download.suggestedFilename();
  try {
    expect(suggestedFilename).toBeTruthy();
  } catch (err) {
    throw new Error(`file didn't get downloaded: ${err.message}`);
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
        //Reload the app so next dataset runs cleanly
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
