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

    // Fetch the ID of the "Area" button from the UI
    const areaButtonId = await page.evaluate(() => {
      const areaButton = document.querySelector('[name="radio"][value="area"]');
      return areaButton ? areaButton.id : null;
    });

    // Check if the ID was successfully fetched
    if (areaButtonId) {
      console.log('ID of the "Area" button:', areaButtonId);
      // Click on the "Area" button using the fetched ID

      await page.evaluate(() => {
        document.querySelector('[name="radio"][value="area"]').click();
      });

      console.log('Clicked on the button "Area".');
    } else {
      console.error('Failed to fetch the ID of the "Area" button.');
    }

    await enterCoordinates(page, '49.3144', '-123.68'); // First set of coordinates
    await enterCoordinates(page, '49.2905', '-123.3265'); // Second set of coordinates
    await enterCoordinates(page, '49.0367', '-123.4583'); // Third set of coordinates

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
    

    // Fetch the ID of the "API Script" button from the UI
    const APIScriptButtonId = await page.evaluate(() => {
        const APIScriptButtonId = document.getElementById('APIscript')
        return APIScriptButtonId ? APIScriptButtonId.id : null;
      });

    //Click on Save Image Button
    await clickSaveImageButton(page, saveImageButtonId);

    await new Promise(r => setTimeout(r, 5000))

    //Generate CSV in Save Image Button
    await generateCSVSaveImageButton(page, saveImageButtonId);

    // Fetch the div class name and ID where the "Dataset" button is present using its id
    const DatasetDivInfo = await page.evaluate(() => {
      const DatasetButton = document.getElementById('left_map');
      if (DatasetButton) {
          const div = DatasetButton.closest('div');
          return {
              className: div.className,
              id: div.id
          };
      } else {
          return { className: 'Dataset in Left Map not found', id: null };
      }
    });

    console.log('Div class name where the Left Map Dataset is present:', DatasetDivInfo.className);
    console.log('Div ID where the Left Map Dataset is present:', DatasetDivInfo.id);

    
    // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
    await page.waitForSelector('.dd-option-button');

    // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
    const clickedButtonName1 = await page.evaluate(() => {
      const giopsButton = document.querySelector('#left_map .dd-option-button');
      if (giopsButton) {
          giopsButton.click();
          return giopsButton.textContent.trim(); // Return the name of the clicked button
      }
    });

    console.log('Clicked button:', clickedButtonName1);

    // Click on the "SalishSeaCast" button
    const clickedButtonName2 = await page.evaluate(() => {
      const riopsButton = document.querySelector('#accordion_SalishSeaCast .accordion-button');
      if (riopsButton) {
          riopsButton.click();
          return riopsButton.textContent.trim(); // Return the name of the clicked button
      }
    });

    console.log('Clicked button:', clickedButtonName2);  

    // Click on the "SalishSeaCast 3D Currents" button inside the "accordion_SalishSeaCast" div
    const clickedButtonName3 = await page.evaluate(() => {
      const riopsAccordion = document.getElementById('accordion_SalishSeaCast');
      if (riopsAccordion) {
        const buttons = riopsAccordion.querySelectorAll('.dd-option-button');
        for (let button of buttons) {
          if (button.textContent.trim() === 'SalishSeaCast 3D Currents') {
            button.click();
            return button.textContent.trim(); // Return the name of the clicked button
          }
        }
      }
    });


    console.log('Clicked button:', clickedButtonName3);

    await new Promise(r => setTimeout(r, 50000))

    // Wait for the option element to become available
    await page.waitForSelector('option[value="sspeed"][data-scale="1410,1560"][data-two_dimensional="false"][data-vector_variable="false"]');

    // Click on the option element
    await page.evaluate(() => {
    const option = document.querySelector('option[value="sspeed"][data-scale="1410,1560"][data-two_dimensional="false"][data-vector_variable="false"]');
    if (option) {
        option.selected = true;
        option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    });

    console.log('sspeed selected!');

    await new Promise(r => setTimeout(r, 6000))


    //Click on Save Image Button
    await clickSaveImageButton(page, saveImageButtonId);    

   await new Promise(r => setTimeout(r, 5000))

    //Generate CSV in Save Image Button
     await generateCSVSaveImageButton(page, saveImageButtonId);
        
     await new Promise(r => setTimeout(r, 5000))

     //Click on API Script Button
     await clickAPIScriptButton(page, APIScriptButtonId);    
      
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

 async function generateCSVSaveImageButton(page, buttonId) {
  if (buttonId) {
    console.log('ID of the "Save Image" button:', buttonId);
    // Click on the "Save Image" button using the fetched ID
    await page.click(`#${buttonId}`);
    console.log('Clicked on the button "Save Image".');

    // Wait for the dropdown menu to become available
    await page.waitForSelector('.dropdown-menu.show');

    // Fetch the ID of the "csv" button from the UI
    const csvButtonId = await page.evaluate(() => {
      const csvButtonId = document.getElementById('csv')
      return csvButtonId ? csvButtonId.id : null;
    });

    if (csvButtonId) {
      console.log('ID of the CSV button:', csvButtonId);
      // Click on the CSV option
      await page.click(`#${csvButtonId}`);
      console.log('Selected the CSV option.');
    } else {
      console.error('Failed to fetch the ID of the CSV button.');
    }
  } else {
    console.error('Failed to fetch the ID of the "Save Image" button.');
  }
}

 async function clickAPIScriptButton(page, buttonId) {
    if (buttonId) {
      console.log('ID of the "API Script" button:', buttonId);
      // Click on the "API Script" button using the fetched ID
      await page.click(`#${buttonId}`);
      console.log('Clicked on the button "API Script".');
  
      // Wait for the dropdown menu to become available
      await page.waitForSelector('.dropdown-menu.show');
  
      // Fetch the ID of the " Python 3 - CSV" button from the UI
      const  Python3CSVButtonId = await page.evaluate(() => {
        const Python3CSVButtonId = document.getElementById('pythonCSV')
        return Python3CSVButtonId ? Python3CSVButtonId.id : null;
      });
  
      if (Python3CSVButtonId) {
        console.log('ID of the Python 3 - CSV ButtonId button:', Python3CSVButtonId);
        // Click on the PNG option
        await page.click(`#${Python3CSVButtonId}`);
        console.log('Selected the Python 3 - CSV ButtonId option.');
      } else {
        console.error('Failed to fetch the ID of the Python 3 - CSV ButtonId button.');
      }
    } else {
      console.error('Failed to fetch the ID of the "API Script" button.');
    }
  }
 
 
 