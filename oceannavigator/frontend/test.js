const puppeteer = require('puppeteer');

(async () => {
  // Launch a non-headless browser
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100, // 100 milliseconds of delay between actions
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox', '--disable-web-security'],
    args: ['--window-size=800,600'] // Set the initial window size
  });

  // Open a new page
  const page = await browser.newPage();

  // Navigate to the webpage
  try {
    await page.goto('https://142.130.125.45:8443/public/');
    console.log('URL Hit successfully!');

    await new Promise(r => setTimeout(r, 5000))

    // Wait for the button with the ID "enter-button" to become visible
    await page.waitForSelector('#enter-button', { visible: true });
    console.log('Button "enter-button" is visible on the page.');

    // Click on the button
    await page.click('#enter-button');
    console.log('Clicked on the button "enter-button".');

    await new Promise(r => setTimeout(r, 5000))

    // Wait for the modal to appear
    await page.waitForSelector('.modal-title');

    // Fetch the title of the modal
    const modalTitle = await page.evaluate(() => {
      const modal = document.querySelector('.modal-title');
      return modal ? modal.innerText : 'Modal title not found';
    });

    console.log('Modal title:', modalTitle);

    // Check if the modal title is "Enter Coordinates"
    if (modalTitle === "Enter Coordinates") {
      console.log("Modal with title " + modalTitle + " is open.");
    } else {
      console.log("Modal is open, but the title is not 'Enter Coordinates'.");
    }

    await enterCoordinates(page, '45.9945', '-57.6699'); // First set of coordinates
    await enterCoordinates(page, '45.559', '-56.9418'); // Second set of coordinates
    await enterCoordinates(page, '45.9945', '-57.6699'); // Third set of coordinates

    await new Promise(r=>setTimeout(r,8000))

      // Fetch the ID of the "Area" button from the UI
    const areaButtonId = await page.evaluate(() => {
      // Query the "Area" button element and extract its ID attribute
      const areaButton = document.querySelector('[name="radio"][value="area"]');
      return areaButton ? areaButton.id : null;
    });

    // Check if the ID was successfully fetched
    if (areaButtonId) {
      console.log('ID of the "Area" button:', areaButtonId);
      // Click on the "Area" button using the fetched ID
      await page.click(`#${areaButtonId}`);
      console.log('Clicked on the button "Area".');
    } else {
      console.error('Failed to fetch the ID of the "Area" button.');
    }


    await new Promise(r=>setTimeout(r,8000))

    // Check if the "Plot" button is disabled
    const isPlotButtonDisabled = await page.evaluate(() => {
      const plotButton = document.getElementById('plot-button');
      return plotButton ? plotButton.disabled : true; // If button not found, consider it as disabled
    });

    if (isPlotButtonDisabled) {
      console.log('Button "Plot" is disabled.');
    } else {
      console.log('Button "Plot" is enabled.');
    }

    // Click on the "Plot" button only if it's not disabled
    if (!isPlotButtonDisabled) {
      await page.click('#plot-button');
      console.log('Clicked on the button "Plot".');
    } else {
      console.log('Cannot click on the disabled button "Plot".');
    }

    // Wait for the modal to appear
    await page.waitForSelector('.modal-title');
    console.log('Modal is visible.');

    await new Promise(r=>setTimeout(r,5000))

    // Fetch the title of the modal
    const modalTitle1 = await page.evaluate(() => {
      const modal = document.querySelector('.modal-title');
      return modal ? modal.innerText : 'Modal title not found';
    });

    console.log('Modal title:', modalTitle1);

    // Wait for the image element to appear within the modal content
    await page.waitForSelector('.modal-content img');
    console.log('Image is displayed within the modal.');

    // Fetch the src attribute value of the image
    const imgSrc = await page.evaluate(() => {
      const imgElement = document.querySelector('.modal-content img');
      return imgElement ? imgElement.src : null;
    });

    // console.log('Image source:', imgSrc);
    
    // Fetch the div class name where the "Save Image" button is present using its id
    const saveImageDivClassName = await page.evaluate(() => {
      const saveImageButton = document.getElementById('save');
      return saveImageButton ? saveImageButton.closest('div').className : 'Save Image button not found';
    });

    console.log('Div class name where the "Save Image" button is present:', saveImageDivClassName);

    await new Promise(r=>setTimeout(r,8000))

    // Fetch the ID of the "Save Image" button from the UI
    const saveImageButtonId = await page.evaluate(() => {
      // Query the "Save Image" button element and extract its ID attribute
      // const saveImageButton = document.querySelector('#save');
      const saveImageButton = document.getElementById('save')

      return saveImageButton ? saveImageButton.id : null;
    });


    if (saveImageButtonId) {
      console.log('ID of the "Save Image" button:', saveImageButtonId);
      // Click on the "Save Image" button using the fetched ID
      await page.click(`#${saveImageButtonId}`);
      console.log('Clicked on the button "Save Image".');
    
      // Wait for the dropdown menu to become available
      await page.waitForSelector('.dropdown-menu.show');
    
      // Select the PNG option directly by its value
      await page.select('.dropdown-menu.show', 'png');
      console.log('Selected the PNG option.');
    } else {
      console.error('Failed to fetch the ID of the "Save Image" button.');
    }
    

    // // Wait for the "Arrows" dropdown to become available
    // await page.waitForSelector('#quiver select');

    // // Select "Water Velocity" from the arrows dropdown
    // await page.select('#quiver select', 'Water Velocity');
    // console.log('Selected "Water Velocity" from the arrows dropdown.');

    // // Wait for the image element to appear within the modal content
    // await page.waitForSelector('.modal-content img');
    // console.log('Image is displayed within the modal.');

    // // Fetch the src attribute value of the image
    // const imgSrcWaterVelocity = await page.evaluate(() => {
    //   const imgElement = document.querySelector('.modal-content img');
    //   return imgElement ? imgElement.src : null;
    // });

    // console.log('Image source for water velocity:', imgSrcWaterVelocity);

  } catch (error) {
    console.error('Error:', error);
  }

  // Close the browser
  await browser.close();
})();

async function enterCoordinates(page, latitude, longitude) {
  // Wait for the latitude input field to become available
  await page.waitForSelector('input#Latitude[type="number"][min="-90"][max="90"]');

  // Enter latitude value into the input field
  await page.type('input#Latitude[type="number"][min="-90"][max="90"]', latitude);

  // Wait for the longitude input field to become available
  await page.waitForSelector('input#Longitude[type="number"][min="-180"][max="180"]');

  // Enter longitude value into the input field
  await page.type('input#Longitude[type="number"][min="-180"][max="180"]', longitude);

  // Wait for the "Add" button to become available
  await page.waitForSelector('button#add');

  // Click on the "Add" button
  await page.click('button#add');
  console.log('Value entered and clicked on the button "Add".');
}
