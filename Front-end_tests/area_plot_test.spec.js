import { test, expect } from "@playwright/test";
import datasets from "./test_datasets.json";

let page;

test.beforeAll(async ({ browser }) => {
  // Create one page globally
  page = await browser.newPage();

  // Only ONE navigation for all datasets
  await page.goto("http://0.0.0.0:8443/public/");

  // Wait for progress bar to detach
  await page.locator(".progress").waitFor({ state: "detached" });
});

test.afterAll(async () => {
  await page.close();
});

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

// Helper function that handles the entire plotting and download process
async function runPlotTest(dataset) {
  console.log(`Running Area test for dataset: ${dataset.name}`);


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

  //test to see if dataset was correctly changed in dataset_selector
  await expect(page.getByRole("button", { name: dataset.name }))
    .toBeVisible()
    .catch((err) => {
      throw new Error(
        `Dataset selector didn't get changed properly: ${err.message}`
      );
    });

  // Open Edit Map Features
  await page.locator(".MapTools > button:nth-child(2)").click();
  //ensure edit map feature window opens
  await expect(page.getByRole("dialog"))
    .toBeVisible()
    .catch((err) => {
      throw new Error(
        `Edit map feature button didn't successfully open the window: ${err.message}`
      );
    });

  // choosing area as upload type
  //label position varies for SalishSeaCAst 3D Currents but same for the rest
  if (dataset.name == "SalishSeaCast 3D Currents") {
    const combo = page.getByRole("combobox").nth(3);
    await combo.selectOption({ label: "Area" });
    //verifying if label change was successful
    await expect(combo)
      .toHaveValue("Polygon")
      .catch((err) => {
        throw new Error(
          `Upload CSV type didn't get changed properly: ${err.message}`
        );
      });
  } else {
    const combo = page.getByRole("dialog").getByRole("combobox");
    await combo.selectOption({ label: "Area" });
    //verifying if label change was successful
    await expect(combo)
      .toHaveValue("Polygon")
      .catch((err) => {
        throw new Error(
          `Upload CSV type didn't get changed properly: ${err.message}`
        );
      });
  }

  // Uploading CSV file
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload CSV" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(dataset.csvPath);
  //verify if csv file uploaded correctly
  await expect(
    page
      .locator("div")
      .filter({ hasText: /^PointLineArea\+LongitudeLatitude$/ })
      .first()
  )
    .toBeVisible()
    .catch((err) => {
      throw new Error(`CSV file didn't get uploaded properly: ${err.message}`);
    });

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
  try {
    expect(plotResponse.status()).toBe(200);
  } catch (err) {
    throw new Error(`Area plot didn't get generated: ${err.message}`);
  }

  // selecting arrows from area settings column
  if (dataset.arrows != "none") {
    const arrowsRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/map") &&
          url.includes("format=json") &&
          url.includes("quiver") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );
    await page
      .getByRole("combobox")
      .nth(dataset.arrow_box_position)
      .selectOption({ label: dataset.arrows });

    //waiting for plot with arrows to be generated
    const arrowsResponse = await arrowsRequestPromise;

    //checking if plot rendered properly with arrows
    try {
      expect(arrowsResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(
        `Area plot with arrows didn't get generated: ${err.message}`
      );
    }
  }
  //selecting Addidtional Contours from Area Settings
  if (dataset.contour != "none") {
    const contourRequestPromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return (
          url.includes("/api/v2.0/plot/map") &&
          url.includes("format=json") &&
          url.includes("contour") &&
          response.request().method() === "GET"
        );
      },
      { timeout: 120000 }
    );

    await page
      .getByRole("combobox")
      .nth(dataset.contour_box_position)
      .selectOption({ label: dataset.contour });
    const contourResponse = await contourRequestPromise;

    //checking if plot rendered properly with additional_contours
    try {
      expect(contourResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(
        `Area plot with contour didn't get generated: ${err.message}`
      );
    }
  }

  //****************************************************************Compare plot TEST**********************************************************************//
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

    try {
      expect(comparePlotResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`Compare plot didn't get generated: ${err.message}`);
    }
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
    try {
      expect(datasetCompareResponse.status()).toBe(200);
    } catch (err) {
      throw new Error(`Compare plot didn't get generated: ${err.message}`);
    }
  }

  //close modal
  await page.getByRole("button", { name: "Close" }).nth(1).click();
  //unclick compare mode
  await page.getByRole("checkbox", { name: "Compare Datasets" }).click();
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
