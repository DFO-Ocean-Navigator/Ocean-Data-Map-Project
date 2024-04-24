// const puppeteer = require('puppeteer');

// (async () => {
//   // Launch a non-headless browser
//   const browser = await puppeteer.launch({ 
//     headless: false,
//     ignoreHTTPSErrors: true,
//     ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox', '--disable-web-security']
//   });

//   // Open a new page
//   const page = await browser.newPage();

//   // Navigate to the webpage
//   try {
//     await page.goto('https://142.130.125.45:8443/public/');
//     console.log('URL Hit successfully!');

//     // Wait for the button to be present in the DOM
//     await page.waitForSelector('#enter-button');
//     console.log('Button Presented!');

//     // Click the button to open the dialog box
//     await page.click('#enter-button');
//     console.log('Button clicked!');

//     // Wait for the dialog box with title "Enter Coordinates" to appear
//     const isDialogBoxOpen = await waitForDialogBox(page, 'Enter Coordinates', 3, 1000);

//     if (isDialogBoxOpen) {
//       console.log('Dialog box with title "Enter Coordinates" is open.');
//     } else {
//       throw new Error('Dialog box with title "Enter Coordinates" not found.');
//     }

//   } catch (error) {
//     console.error('Error:', error);
//   }

//   // Close the browser
//   await browser.close();
// })();

// async function waitForDialogBox(page, title, maxRetries, interval) {
//   let retries = 0;
//   while (retries < maxRetries) {
//     try {
//       // Check if the dialog box with the given title is present
//       const isDialogBoxOpen = await page.evaluate((title) => {
//         const modalTitleElement = document.querySelector('.modal-title');
//         return modalTitleElement && modalTitleElement.innerText === title;
//       }, title);

//       if (isDialogBoxOpen) {
//         return true;
//       }
//     } catch (error) {
//       console.error('Error while waiting for dialog box:', error);
//     }

//     // Wait for a short interval before retrying
//     await new Promise(resolve => setTimeout(resolve, interval));
//     retries++;
//   }
//   return false;
// }

//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// const puppeteer = require('puppeteer');

// (async () => {
//   // Launch a non-headless browser
//   const browser = await puppeteer.launch({ 
//     headless: false,
//     ignoreHTTPSErrors: true,
//     ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox', '--disable-web-security']
//   });

//   // Open a new page
//   const page = await browser.newPage();

//   // Navigate to the webpage
//   try {
//     await page.goto('https://142.130.125.45:8443/public/');
//     console.log('URL Hit successfully!');

//     // Wait for the modal to appear
//     await waitForDialogBox(page);

//     console.log('Dialog box is open.');

//     // Fetch the title of the modal
//     const modalTitle = await page.evaluate(() => {
//       const modal = document.querySelector('.modal-title');
//       return modal ? modal.innerText : 'Modal title not found';
//     });

//     console.log('Modal title:', modalTitle);

//     // Wait for the button to be present in the DOM
//     await page.waitForSelector('#enter-button');
//     console.log('Button Presented!');

//     // Click the button
//     await page.click('#enter-button');
//     console.log('Button clicked!');

//   } catch (error) {
//     console.error('Error:', error);
//   }

//   // Close the browser
//   await browser.close();
// })();

// async function waitForDialogBox(page) {
//   // Wait for the modal to become visible
//   await page.waitForSelector('.modal', { visible: true, timeout: 5000 });
// }

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const puppeteer = require('puppeteer');

(async () => {
  // Launch a non-headless browser
  // const browser = await puppeteer.launch({
  //   headless: false,
  //   ignoreHTTPSErrors: true,
  //   ignoreDefaultArgs: ['--disable-extensions', '--disable-setuid-sandbox', '--disable-web-security']

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

    await new Promise(r=>setTimeout(r,5000))

    // Wait for the button with the ID "enter-button" to become visible
    await page.waitForSelector('#enter-button', { visible: true });
    console.log('Button "enter-button" is visible on the page.');

    // Get the class name of the div containing the button with ID "enter-button"
    const className = await page.evaluate(() => {
      const button = document.querySelector('#enter-button');
      return button ? button.parentElement.className : 'Class name not found';
    });

    console.log('Class name of the div containing the button:', className);

    // Click on the button
    await page.click('#enter-button');
    console.log('Clicked on the button "enter-button".');

    await new Promise(r=>setTimeout(r,5000))

    // Wait for the modal to appear
    await page.waitForSelector('.modal-title');



    // Fetch the title of the modal
    const modalTitle = await page.evaluate(() => {
      const modal = document.querySelector('.modal-title');
      return modal ? modal.innerText : 'Modal title not found';
    });

    console.log('Modal title:', modalTitle);

    // // Get the title of the modal
    // const modalTitle = await page.$eval('.modal-title', (element) => element.textContent);

    // Check if the modal title is "Enter Coordinates"
    if (modalTitle === "Enter Coordinates") {
      console.log("Modal with title " + modalTitle + " is open.");
    } else {
      console.log("Modal is open, but the title is not 'Enter Coordinates'.");
    }

    // Get the class name of the div containing the modal with the title "Enter Coordinates"
    const modalParentClassName = await page.evaluate(() => {
      const modal = document.querySelector('.modal-title');
      return modal ? modal.parentElement.parentElement.className : 'Class name not found';
    });

    console.log('Class name of the div containing the modal:', modalParentClassName);

    await new Promise(r=>setTimeout(r,5000))
    
    // Wait for the "Upload CSV" button to become visible inside the modal
    await page.waitForSelector('.plot-button-container .plot-button');
    console.log('Button "Upload CSV" is visible inside the modal.');

    // Click on the "Upload CSV" button
    // await page.click('.plot-button-container .plot-button');
    await page.click('#Upload-CSV');
    console.log('Clicked on the button "Upload CSV".');

     // Wait for the file input to become visible
     await page.waitForSelector('input[type=file]');
     console.log('File input is visible.');
 
     // Upload the CSV file
     
    const filePath = 'oceannavigator/SeleniumData/Total Area Great Lakes 1.csv';
    const fileInput = await page.$('input[type=file]');
    await fileInput.uploadFile(filePath);
    console.log('CSV file uploaded successfully.');

    await new Promise(r=>setTimeout(r,8000))

    // Click on the "Area" button
    await page.click('#radio-2');
    console.log('Clicked on the button "Area".');

     // Click on the "Plot" button
    // await page.click('.plot-button-container .plot-button');
    await page.click('#plot-button');
    console.log('Clicked on the button "Plot".');

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

    // Check if "Area Settings" is present in the modal content
    const isAreaSettingsPresent = await page.evaluate(() => {
      const modalContent = document.querySelector('.modal-content');
      return modalContent ? modalContent.innerText.includes('Area Settings') : false;
    });

    if (isAreaSettingsPresent) {
      console.log('"Area Settings" is present in the modal.');
    } else {
      console.log('"Area Settings" is not present in the modal.');
    }

  } catch (error) {
    console.error('Error:', error);
  }

  // Close the browser
  await browser.close();
})();
