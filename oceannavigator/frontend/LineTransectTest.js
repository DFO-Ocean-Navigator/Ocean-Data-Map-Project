const puppeteer = require('puppeteer');

(async () => {
  // Launch a non-headless browser
  try {
    const browser = await puppeteer.launch({
      headless: false,
      slowMo: 100, // 100 milliseconds of delay between actions
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox', '--disable-web-security'],
      // args: ['--window-size=800,600'] // Set the initial window size
      args: ['--remote-debugging-port=9222', '--remote-debugging-address=0.0.0.0', '--no-sandbox', '--window-size=800,600'],
    });

    // Open a new page
    const page = await browser.newPage();
    const client = await page.createCDPSession();

    await client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: '/home/ubuntu/onav-cloud/Ocean-Data-Map-Project/oceannavigator/frontend/'})
    // Navigate to the webpage

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

    await new Promise(r => setTimeout(r, 2000))

    // Fetch the ID of the "Line" button from the UI
    const lineButtonId = await page.evaluate(() => {
      const lineButtonId = document.querySelector('[name="radio"][value="line"]');
      return lineButtonId ? lineButtonId.id : null;
    });

    // Check if the ID was successfully fetched
    if (lineButtonId) {
      console.log('ID of the "Line" button:', lineButtonId);

      // Click on the "Line" button using the fetched ID

      await page.evaluate(() => {
        document.querySelector('[name="radio"][value="line"]').click();
      });

      console.log('Clicked on the button "Line".');
    } else {
      console.error('Failed to fetch the ID of the "Line" button.');
    }

    await enterCoordinates(page, '47.0000', '-52.8320'); // First set of coordinates
    await enterCoordinates(page, '47.0000', '-42.0000'); // First set of coordinates

    await new Promise(r => setTimeout(r, 8000))

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

    await new Promise(r => setTimeout(r, 5000))

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


    // Fetch the div class name where the "Save Image" button is present using its id
    const saveImageDivClassName = await page.evaluate(() => {
      const saveImageButton = document.getElementById('save-image');
      return saveImageButton ? saveImageButton.closest('div').className : 'Save Image button not found';
    });

    console.log('Div class name where the "Save Image" button is present:', saveImageDivClassName);

    await new Promise(r => setTimeout(r, 5000))

    // Fetch the ID of the "Save Image" button from the UI
    const saveImageButtonId = await page.evaluate(() => {
      const saveImageButton = document.getElementById('save-image')
      return saveImageButton ? saveImageButton.id : null;
    });

    await new Promise(r => setTimeout(r, 5000))

    //Click on Save Image Button
    await clickSaveImageButton(page, saveImageButtonId);

    await new Promise(r => setTimeout(r, 5000)) 


    // Click on the "Hovmöller Diagram" tab
    await page.click('.nav-link[href="#"][data-rr-ui-event-key="2"]');
    console.log('Clicked on the "Hovmöller Diagram" tab.');

    await new Promise(r => setTimeout(r, 8000))

    //Click on Save Image Button
    await clickSaveImageButton(page, saveImageButtonId);

    await new Promise(r => setTimeout(r, 5000)) 

    // Close the browser
    await browser.close();

} catch (error) {
    console.error('Error:', error);
}
 
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
async function clickSaveImageButton(page, buttonId) {
    if (buttonId) {
      console.log('ID of the "Save Image" button:', buttonId);
      // Click on the "Save Image" button using the fetched ID
      await page.click(`#${buttonId}`);
      console.log('Clicked on the button "Save Image".');
  
      // Wait for the dropdown menu to become available
      await page.waitForSelector('.dropdown-menu.show');
  
      // Fetch the ID of the "png" button from the UI
      const pngButtonId = await page.evaluate(() => {
        const pngButtonId = document.getElementById('png')
        return pngButtonId ? pngButtonId.id : null;
      });
  
      if (pngButtonId) {
        console.log('ID of the PNG button:', pngButtonId);
        // Click on the PNG option
        await page.click(`#${pngButtonId}`);
        console.log('Selected the PNG option.');
      } else {
        console.error('Failed to fetch the ID of the PNG button.');
      }
    } else {
      console.error('Failed to fetch the ID of the "Save Image" button.');
    }
}

// here the last clickSaveImageButton is not working as in dropdown the below options are dissable so not clicking on png
 