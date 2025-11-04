import { test, expect } from "@playwright/test";
import datasets from './test_datasets.json';

// handles subset download
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
    // Open Edit Map Features
   await page.locator(".MapTools > button:nth-child(2)").click();

    // choosing area as upload type
    //label position varies for SalishSeaCAst 3D Currents but same for the rest
    if (dataset.name == "SalishSeaCast 3D Currents") {
      await page.getByRole("combobox").nth(3).selectOption({ label: "Area" });
    } else {
      await page.getByRole("dialog").getByRole("combobox").selectOption({ label: "Area" });
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
      { timeout: 150000 }
    );

    //listening for download event
    const downloadPromise = page.waitForEvent("download");

    //clicking save file, should start downlaod
    await page.getByRole("button", { name: "Save", exact: true }).click();

    //check if back-end sends data
    const downloadresponse= await downloadRequestPromise;
    expect(downloadresponse.status()).toBe(200);

    // check if any error ocurred while downloading the file
    if (consoleErrors.length > 0) {
      throw new Error(
        `Captured console errors for dataset "${
          dataset.name
        }":\n- ${consoleErrors.join("\n- ")}`
      );
    }
    // download object created, if browser begins downloading
    const download = await downloadPromise;
    //giving a name to the file and ensuring download has started
    //Note: file created will not be stored in the system and automatically cleaned up after test finishes
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toBeTruthy();

}finally {
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