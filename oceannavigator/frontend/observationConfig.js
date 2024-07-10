const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-setuid-sandbox',
      '--disable-web-security'
    ],
    args: [
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
      '--no-sandbox',
      '--window-size=800,600'
    ]
  });

  // Open a new page
  const page = await browser.newPage();
  const client = await page.createCDPSession();

  await client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: '/home/ubuntu/onav-cloud/Ocean-Data-Map-Project/oceannavigator/frontend/'});
  
  // Navigate to the webpage
  await page.goto('https://142.130.125.45:8443/public/');
  console.log('URL Hit successfully!');

  await new Promise(r => setTimeout(r, 5000));

  // Load the configuration file
  const config = JSON.parse(fs.readFileSync('config.json'));

  try {
    const observation_type = config.observations.observation_type;
    const start_date = config.observations.start_date;
    const end_date = config.observations.end_date;
    const data_type  = config.observations.data_type;
    const data_type_selector = `option[value="${data_type}"]`;

    console.log(`Observation type selected: ${observation_type}`);
    console.log(`Start Date selected: ${start_date}`);
    console.log(`End Date selected: ${end_date}`);
    console.log(`Data Type  selected: ${data_type}`);

    // Wait for the button with the ID "obs-tooltip" to become visible
    await page.waitForSelector('#obs-tooltip', { visible: true });
    console.log('Button "obs-tooltip" is visible on the page.');

    // Click on the button
    await page.click('#obs-tooltip');
    console.log('Clicked on the button "obs-tooltip".');
    await new Promise(r => setTimeout(r, 2000));

    // Wait for the button with the ID "all_button" to become visible
    await page.waitForSelector('#all_button', { visible: true });
    console.log('Button "all_button" is visible on the page.');

    // Click on the "All" button
    await page.click('#all_button');
    console.log('Clicked on ""All" button with id: "all_button".');
    await new Promise(r => setTimeout(r, 2000));

    // Wait for the modal to appear
    await page.waitForSelector('.modal-title');
    const modalTitle = await page.evaluate(() => {
        const modal = document.querySelector('.modal-title');
        return modal ? modal.innerText : 'Modal title not found';
    });
    console.log('Modal title:', modalTitle);

    // Check if the modal title is "Select Observations"
    if (modalTitle === "Select Observations") {
        console.log("Modal with title " + modalTitle + " is open.");
    } else {
        console.log("Modal is open, but the title is not 'Select Observations'.");
    }
    await new Promise(r => setTimeout(r, 2000));

    // Select the "Points" radio button   
    await page.waitForSelector(`#${observation_type}`, { visible: true });
    await page.click(`#${observation_type}`);
    console.log(`Selected the "${observation_type}" radio button.`);
      
    await new Promise(r => setTimeout(r, 2000));


    // Wait for the startDate input field to become available
    await page.waitForSelector('input#startDate[type="text"]');

    // Focus on the startDate input field
    await page.focus('input#startDate[type="text"]');

    // Clear the existing value in the startDate input field
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

    // Enter startDate value into the input field
    await page.type('input#startDate[type="text"]', `${start_date}`);

    console.log(`Start date entered is: "${start_date}".`);

    // Wait for the endDate input field to become available
    await page.waitForSelector('input#endDate[type="text"]');

    // Focus on the endDate input field
    await page.focus('input#endDate[type="text"]');

    // Clear the existing value in the endDate input field
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

    // Enter endDate value into the input field
    await page.type('input#endDate[type="text"]', `${end_date}`);

    console.log(`Start date entered is: "${end_date}".`);
    
    await new Promise(r => setTimeout(r, 4000));

   // Select Datatype
   await page.evaluate((data_type_selector) => {
    const option = document.querySelector(data_type_selector);
    if (option) {
      option.selected = true;
      option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
    }, data_type_selector);

    console.log(`Variable Selected - "${data_type}" Selected!`);

    await new Promise(r => setTimeout(r, 3000));
    
    // Click on the "Apply" button
    const clickedApply = await page.evaluate(() => {
    const applyButton = document.querySelector('#apply-button');
    if (applyButton) {
        applyButton.click();
        return applyButton.textContent.trim(); // Return the name of the clicked button
    }
    });

    console.log('Clicked button:', clickedApply);
    await new Promise(r => setTimeout(r, 5000))

  } 
  
  catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();



