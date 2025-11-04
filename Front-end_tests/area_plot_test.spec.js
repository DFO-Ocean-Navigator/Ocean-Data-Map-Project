import { test, expect } from "@playwright/test";
import datasets from './test_datasets.json';


// Helper function that handles the entire plotting and download process
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

    // check if there is any console errors after loading the dataset
    if (consoleErrors.length > 0) {
      throw new Error(
        `console errors":\n- ${consoleErrors.join("\n- ")}`
      );
    }

    // Open Edit Map Features
    await page.locator(".MapTools > button:nth-child(2)").click();
    //ensure edit map feature window opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // choosing area as upload type
    //label position varies for SalishSeaCAst 3D Currents but same for the rest
    if (dataset.name == "SalishSeaCast 3D Currents") {
      const combo = page.getByRole("combobox").nth(3);
      await combo.selectOption({ label: "Area" });
      //verifying if label change was successful
      await expect(combo).toHaveValue("Polygon");
    } else {
      const combo = page.getByRole("dialog").getByRole("combobox");
      await combo.selectOption({ label: "Area" });
      //verifying if label change was successful
      await expect(combo).toHaveValue("Polygon");
    }

    // Uploading CSV file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload CSV" }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(dataset.csvPath);
    await page.waitForTimeout(2000);
    //verify if csv file uploaded correctly
    await expect(
      page
        .locator("div")
        .filter({ hasText: /^PointLineArea\+LongitudeLatitude$/ })
        .first()
    ).toBeVisible();

    // Select checkbox
    await page.getByRole("dialog").getByRole("checkbox").check();

    // Listen for plot request
    const plotRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/map") &&
          url.includes("format=json") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    // Plot
    await page.getByRole("button", { name: "Plot Selected Features" }).click();
  
    // Check API response
    //this check confirms if plot is being sent correctly from the back-end
    const plotResponse = await plotRequestPromise;
    expect(plotResponse.status()).toBe(200);

    //test to see if dataset was correctly changed in dataset_selector
    await expect(
      page.locator("#left_map").getByRole("button", { name: dataset.name })
    ).toBeVisible();

    // selecting arrows from area settings column
    if (dataset.arrows != "none") {
      const arrowsRequestPromise = page.waitForResponse(
        (response) => {
          const url = response.url();
          return (
            url.includes("/api/v2.0/plot/map") &&
            url.includes("format=json") &&
            url.includes("quiver")&&
            response.request().method() === "GET"
          );
        },
        { timeout: 120000 }
      );
      await page.getByRole("combobox").nth(dataset.arrow_box_position).selectOption({ label: dataset.arrows });

      //waiting for plot with arrows to be generated
      const arrowsResponse = await arrowsRequestPromise;
      
      //checking if plot rendered properly with arrows
      expect(arrowsResponse.status()).toBe(200);
    }
    //selecting Addidtional Contours from Area Settings
    if (dataset.contour != "none") {
       const contourRequestPromise = page.waitForResponse(response => {
    const url = response.url();
    return (
      url.includes('/api/v2.0/plot/map') &&
      url.includes('format=json') &&
      url.includes('contour') && 
      response.request().method() === 'GET'
    );
  }, { timeout: 120000 });


      await page.getByRole("combobox").nth(dataset.contour_box_position).selectOption({ label: dataset.contour });
      const contourResponse = await contourRequestPromise;

     //checking if plot rendered properly with additional_contours
      expect(contourResponse.status()).toBe(200);
    }
    console.log(`✅ Completed dataset: ${dataset.name}`);

    //**********************************************************************************//
  } 
  
  finally {
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