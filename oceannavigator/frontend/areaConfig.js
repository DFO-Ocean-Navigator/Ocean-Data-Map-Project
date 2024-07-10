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
    for (const datasetName of Object.keys(config.area_plot.datasets)) {
      const dataset = config.area_plot.datasets[datasetName];
      const coordinates = dataset.coordinates;
      const arrowValue = dataset.Arrows ? dataset.Arrows[0] : null;
      const additionalContours = dataset.Additional_Contours ? dataset.Additional_Contours[0] : null;
      const variables = dataset.variables;
      const variableSelector  = `option[value="${variables}"]`;



      console.log(`Processing dataset: ${datasetName}`);
      console.log(`Variable processing: ${variables}`)

      // Perform actions based on the dataset
      switch (datasetName) {
        case 'GIOPS 10 day Forecast 3D - LatLon':
          // Select dataset and perform actions
          await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
          break;

        case 'RIOPS 10 day Forecast 3D - Polar Stereographic':
          // Select 'RIOPS Forecast' and then 'RIOPS 10 day Forecast 3D - Polar Stereographic'

            // Fetch the div class name and ID where the "Dataset" button is present using its id
          const DatasetDivInfoRIOPS3DPolar = await page.evaluate(() => {
            const DatasetButton = document.getElementById('dataset-selector-dataset_0');
            if (DatasetButton) {
                const div = DatasetButton.closest('div');
                return {
                    className: div.className,
                    id: div.id
                };
            } else {
                return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
            }
          });

          console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoRIOPS3DPolar.className);
          console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoRIOPS3DPolar.id);

          
          // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
          await page.waitForSelector('.dd-option-button');

          // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
          const clickedButtonName1RIOPS3DPolar = await page.evaluate(() => {
            const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
            if (giopsButton) {
                giopsButton.click();
                return giopsButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName1RIOPS3DPolar);

          // Click on the "RIOPS Forecast" button
          const clickedButtonName2RIOPS3DPolar = await page.evaluate(() => {
            const riopsButton = document.querySelector('#accordion_RIOPS Forecast .accordion-button');
            if (riopsButton) {
                riopsButton.click();
                return riopsButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName2RIOPS3DPolar);  

          // Click on the "RIOPS Forecast 3D - Polar Stereographic" button inside the "accordion_RIOPS Forecast" div
          const clickedButtonName3RIOPS3DPolar = await page.evaluate(() => {
            const riopsAccordion = document.getElementById('accordion_RIOPS Forecast');
            if (riopsAccordion) {
              const buttons = riopsAccordion.querySelectorAll('.dd-option-button');
              for (let button of buttons) {
                if (button.textContent.trim() === 'RIOPS Forecast 3D - Polar Stereographic') {
                  button.click();
                  return button.textContent.trim(); // Return the name of the clicked button
                }
              }
            }
          });


          console.log('Clicked button:', clickedButtonName3RIOPS3DPolar);

          await new Promise(r => setTimeout(r, 5000))

          // Wait for the option with the dynamic arrow value
          await page.waitForSelector(variableSelector);
        
          // Click on the option element
          await page.evaluate((variableSelector) => {
            const option = document.querySelector(variableSelector);
            if (option) {
              option.selected = true;
              option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, variableSelector);

          console.log(`Variable Selected - "${variables}" Selected!`);

          await new Promise(r => setTimeout(r, 6000))

          // Click on the "Go" button
          const clickedButtonName43RIOPS3DPolar = await page.evaluate(() => {
            const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
            if (goButton) {
                goButton.click();
                return goButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName43RIOPS3DPolar);
          await new Promise(r => setTimeout(r, 50000))

          // Select dataset and perform actions
          await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
          break;

        case 'CCG RIOPS Forecast Surface - LatLon':
          // Select 'RIOPS Forecast' and then 'CCG RIOPS Forecast Surface - LatLon'
        
          // Fetch the div class name and ID where the "Dataset" button is present using its id
          const DatasetDivInfoCCGRIOPS = await page.evaluate(() => {
          const DatasetButton = document.getElementById('dataset-selector-dataset_0');
          if (DatasetButton) {
              const div = DatasetButton.closest('div');
              return {
                  className: div.className,
                  id: div.id
              };
          } else {
              return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
          }
          });

          console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCCGRIOPS.className);
          console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCCGRIOPS.id);

          
          // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
          await page.waitForSelector('.dd-option-button');

          // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
          const clickedButtonName1CCGRIOPS = await page.evaluate(() => {
            const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
            if (giopsButton) {
                giopsButton.click();
                return giopsButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName1CCGRIOPS);

          // Click on the "RIOPS Forecast" button
          const clickedButtonName2CCGRIOPS = await page.evaluate(() => {
            const riopsButton = document.querySelector('#accordion_RIOPS Forecast .accordion-button');
            if (riopsButton) {
                riopsButton.click();
                return riopsButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName2CCGRIOPS);  

          // Click on the "CCG RIOPS Forecast Surface - LatLon" button inside the "accordion_RIOPS Forecast" div
          const clickedButtonName3CCGRIOPS = await page.evaluate(() => {
            const riopsAccordion = document.getElementById('accordion_RIOPS Forecast');
            if (riopsAccordion) {
              const buttons = riopsAccordion.querySelectorAll('.dd-option-button');
              for (let button of buttons) {
                if (button.textContent.trim() === 'CCG RIOPS Forecast Surface - LatLon') {
                  button.click();
                  return button.textContent.trim(); // Return the name of the clicked button
                }
              }
            }
          });


          console.log('Clicked button:', clickedButtonName3CCGRIOPS);

          await new Promise(r => setTimeout(r, 5000))

          // Wait for the option with the dynamic arrow value
          await page.waitForSelector(variableSelector);
        
          // Click on the option element
          await page.evaluate((variableSelector) => {
            const option = document.querySelector(variableSelector);
            if (option) {
              option.selected = true;
              option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, variableSelector);

          console.log(`Variable Selected - "${variables}" Selected!`);

          await new Promise(r => setTimeout(r, 6000))

          // Click on the "Go" button
          const clickedButtonName43CCGRIOPS = await page.evaluate(() => {
            const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
            if (goButton) {
                goButton.click();
                return goButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName43CCGRIOPS);
          await new Promise(r => setTimeout(r, 50000)) 
          // Select dataset and perform actions
          await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
          break; 
      
        case 'SalishSeaCast 3D currents':
          // Select 'SalishSeaCast' and then 'SalishSeaCast 3D Currents'

          // Fetch the div class name and ID where the "Dataset" button is present using its id
          const DatasetDivInfoSalishSeaCast = await page.evaluate(() => {
          const DatasetButton = document.getElementById('dataset-selector-dataset_0');
          if (DatasetButton) {
              const div = DatasetButton.closest('div');
              return {
                  className: div.className,
                  id: div.id
              };
          } else {
              return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
          }
          });

          console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoSalishSeaCast.className);
          console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoSalishSeaCast.id);

          
          // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
          await page.waitForSelector('.dd-option-button');

          // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
          const clickedButtonName1SalishSeaCast = await page.evaluate(() => {
            const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
            if (giopsButton) {
                giopsButton.click();
                return giopsButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName1SalishSeaCast);

          // Click on the "SalishSeaCast" button
          const clickedButtonName2SalishSeaCast = await page.evaluate(() => {
            const SalishSeaCastButton = document.querySelector('#accordion_SalishSeaCast .accordion-button');
            if (SalishSeaCastButton) {
              SalishSeaCastButton.click();
                return SalishSeaCastButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName2SalishSeaCast);  

          // Click on the "SalishSeaCast 3D Currents" button inside the "accordion_SalishSeaCast" div
          const clickedButtonName3SalishSeaCast = await page.evaluate(() => {
            const SalishSeaCastAccordion = document.getElementById('accordion_SalishSeaCast');
            if (SalishSeaCastAccordion) {
              const buttons = SalishSeaCastAccordion.querySelectorAll('.dd-option-button');
              for (let button of buttons) {
                if (button.textContent.trim() === 'SalishSeaCast 3D Currents') {
                  button.click();
                  return button.textContent.trim(); // Return the name of the clicked button
                }
              }
            }
          });


          console.log('Clicked button:', clickedButtonName3SalishSeaCast);

          await new Promise(r => setTimeout(r, 5000))
          
          // Wait for the option with the dynamic arrow value
          await page.waitForSelector(variableSelector);
        
          // Click on the option element
          await page.evaluate((variableSelector) => {
            const option = document.querySelector(variableSelector);
            if (option) {
              option.selected = true;
              option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, variableSelector);

          console.log(`Variable Selected - "${variables}" Selected!`);

          await new Promise(r => setTimeout(r, 6000))

          // Click on the "Go" button
          const clickedButtonName4SalishSeaCast = await page.evaluate(() => {
            const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
            if (goButton) {
                goButton.click();
                return goButton.textContent.trim(); // Return the name of the clicked button
            }
          });

          console.log('Clicked button:', clickedButtonName4SalishSeaCast);
          await new Promise(r => setTimeout(r, 50000))
      
          await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
          break;

          case 'WCPs-GLS Great Lakes':
            // Fetch the div class name and ID where the "Dataset" button is present using its id
            const DatasetDivInfoWCPS  = await page.evaluate(() => {
            const DatasetButton = document.getElementById('dataset-selector-dataset_0');
            if (DatasetButton) {
                const div = DatasetButton.closest('div');
                return {
                    className: div.className,
                    id: div.id
                };
            } else {
                return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
            }
            });

            console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoWCPS.className);
            console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoWCPS.id);

            
            // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
            await page.waitForSelector('.dd-option-button');

            // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
            const clickedButtonName1WCPS = await page.evaluate(() => {
              const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
              if (giopsButton) {
                  giopsButton.click();
                  return giopsButton.textContent.trim(); // Return the name of the clicked button
              }
            });

            console.log('Clicked button:', clickedButtonName1WCPS);

            // Click on the "WCPS Forecast" button
            const clickedButtonName2WCPS = await page.evaluate(() => {
              const WCPSButton = document.querySelector('#accordion_WCPS Forecast .accordion-button');
              if (WCPSButton) {
                WCPSButton.click();
                  return WCPSButton.textContent.trim(); // Return the name of the clicked button
              }
            });

            console.log('Clicked button:', clickedButtonName2WCPS);  

            // Click on the "WCPS-GLS Great Lakes Coupled Atmosphere-Ocean-Ice Forecast - LatLon" button inside the "accordion_WCPS Forecast" div
            const clickedButtonName3WCPS = await page.evaluate(() => {
              const WCPSAccordion = document.getElementById('accordion_WCPS Forecast');
              if (WCPSAccordion) {
                const buttons = WCPSAccordion.querySelectorAll('.dd-option-button');
                for (let button of buttons) {
                  if (button.textContent.trim() === 'WCPS-GLS Great Lakes Coupled Atmosphere-Ocean-Ice Forecast - LatLon') {
                    button.click();
                    return button.textContent.trim(); // Return the name of the clicked button
                  }
                }
              }
            });


            console.log('Clicked button:', clickedButtonName3WCPS);

            await new Promise(r => setTimeout(r, 5000))

            // Wait for the option with the dynamic arrow value
          await page.waitForSelector(variableSelector);
        
          // Click on the option element
          await page.evaluate((variableSelector) => {
            const option = document.querySelector(variableSelector);
            if (option) {
              option.selected = true;
              option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, variableSelector);

          console.log(`Variable Selected - "${variables}" Selected!`);

          await new Promise(r => setTimeout(r, 6000))

            // Click on the "Go" button
            const clickedButtonName4WCPS = await page.evaluate(() => {
              const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
              if (goButton) {
                  goButton.click();
                  return goButton.textContent.trim(); // Return the name of the clicked button
              }
            });

            console.log('Clicked button:', clickedButtonName4WCPS);
            await new Promise(r => setTimeout(r, 50000))
              
            await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
            break;

            case 'CMEMS Global Ocean PHYS Reanalysis (Monthly 1/12) deg':
              // Select 'CMEMS' and then 'CMEMS Global Ocean PHYS Reanalysis (Monthly 1/12) deg'

                // Fetch the div class name and ID where the "Dataset" button is present using its id
              const DatasetDivInfoCMEMS = await page.evaluate(() => {
                const DatasetButton = document.getElementById('dataset-selector-dataset_0');
                if (DatasetButton) {
                    const div = DatasetButton.closest('div');
                    return {
                        className: div.className,
                        id: div.id
                    };
                } else {
                    return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
                }
              });

              console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCMEMS.className);
              console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCMEMS.id);

              
              // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
              await page.waitForSelector('.dd-option-button');

              // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
              const clickedButtonName1CMEMS = await page.evaluate(() => {
                const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
                if (giopsButton) {
                    giopsButton.click();
                    return giopsButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName1CMEMS);

              // Click on the "CMEMS" button
              const clickedButtonName2CMEMS = await page.evaluate(() => {
                const CMEMSButton = document.querySelector('#aaccordion_CMEMS .accordion-button');
                if (CMEMSButton) {
                  CMEMSButton.click();
                    return CMEMSButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName2CMEMS);  

              // Click on the "CMEMS Global Ocean PHYS Reanalysis Climatology (Monthly mean) 1/12 deg" button inside the "accordion_CMEMS" div
              const clickedButtonName3CMEMS = await page.evaluate(() => {
                const CMEMSAccordion = document.getElementById('accordion_CMEMS');
                if (CMEMSAccordion) {
                  const buttons = CMEMSAccordion.querySelectorAll('.dd-option-button');
                  for (let button of buttons) {
                    if (button.textContent.trim() === 'CMEMS Global Ocean PHYS Reanalysis Climatology (Monthly mean) 1/12 deg') {
                      button.click();
                      return button.textContent.trim(); // Return the name of the clicked button
                    }
                  }
                }
              });


              console.log('Clicked button:', clickedButtonName3CMEMS);

              await new Promise(r => setTimeout(r, 5000))

              
              // Wait for the option with the dynamic arrow value
              await page.waitForSelector(variableSelector);
            
              // Click on the option element
              await page.evaluate((variableSelector) => {
                const option = document.querySelector(variableSelector);
                if (option) {
                  option.selected = true;
                  option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, variableSelector);

              console.log(`Variable Selected - "${variables}" Selected!`);

              await new Promise(r => setTimeout(r, 6000))

              // Click on the "Go" button
              const clickedButtonName4CMEMS = await page.evaluate(() => {
                const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
                if (goButton) {
                    goButton.click();
                    return goButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName4CMEMS);
              await new Promise(r => setTimeout(r, 50000))

              await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
              break; 

            case 'CIOPS Forecast East 3D - LatLon':
              // Fetch the div class name and ID where the "Dataset" button is present using its id
              const DatasetDivInfoCIOPSEast3D = await page.evaluate(() => {
                const DatasetButton = document.getElementById('dataset-selector-dataset_0');
                if (DatasetButton) {
                    const div = DatasetButton.closest('div');
                    return {
                        className: div.className,
                        id: div.id
                    };
                } else {
                    return { className: 'Dataset in dataset-selector-dataset_0 not found', id: null };
                }
              });

              console.log('Div class name where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCIOPSEast3D .className);
              console.log('Div ID where the dataset-selector-dataset_0 Dataset is present:', DatasetDivInfoCIOPSEast3D .id);

              
              // Wait for the button with the label "GIOPS 10 day Forecast 3D - LatLon" to become available
              await page.waitForSelector('.dd-option-button');

              // Click on the "GIOPS 10 day Forecast 3D - LatLon" button
              const clickedButtonName1CIOPSEast3D = await page.evaluate(() => {
                const giopsButton = document.querySelector('#dataset-selector-dataset_0 .dd-option-button');
                if (giopsButton) {
                    giopsButton.click();
                    return giopsButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName1CIOPSEast3D);

              // Click on the "CIOPS Forecast" button
              const clickedButtonName2CIOPSEast3D = await page.evaluate(() => {
                const CIOPSButton = document.querySelector('#accordion_CIOPS Forecast .accordion-button');
                if (CIOPSButton) {
                  CIOPSButton.click();
                    return CIOPSButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName2CIOPSEast3D);  

              // Click on the "CIOPS Forecast East 3D - LatLon" button inside the "accordion_CIOPS Forecast" div
              const clickedButtonName3CIOPSEast3D = await page.evaluate(() => {
                const CIOPSAccordion = document.getElementById('accordion_CIOPS Forecast');
                if (CIOPSAccordion) {
                  const buttons = CIOPSAccordion.querySelectorAll('.dd-option-button');
                  for (let button of buttons) {
                    if (button.textContent.trim() === 'CIOPS Forecast East 3D - LatLon') {
                      button.click();
                      return button.textContent.trim(); // Return the name of the clicked button
                    }
                  }
                }
              });


              console.log('Clicked button:', clickedButtonName3CIOPSEast3D);

              await new Promise(r => setTimeout(r, 5000))

              // Wait for the option with the dynamic arrow value
              await page.waitForSelector(variableSelector);
            
              // Click on the option element
              await page.evaluate((variableSelector) => {
                const option = document.querySelector(variableSelector);
                if (option) {
                  option.selected = true;
                  option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, variableSelector);

              console.log(`Variable Selected - "${variables}" Selected!`);

              await new Promise(r => setTimeout(r, 6000))

              // Click on the "Go" button
              const clickedButtonName43CIOPSEast3D = await page.evaluate(() => {
                const goButton = document.querySelector('#dataset-selector-dataset_0 .go-button');
                if (goButton) {
                    goButton.click();
                    return goButton.textContent.trim(); // Return the name of the clicked button
                }
              });

              console.log('Clicked button:', clickedButtonName43CIOPSEast3D);
              await new Promise(r => setTimeout(r, 50000))

              await selectDatasetAndPerformActions(page, coordinates, datasetName, arrowValue, additionalContours);
              break;

          default:
            console.log(`Dataset '${datasetName}' not recognized.`);
            continue;
      }
    }

    // Close the browser
    await browser.close();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();

async function selectDatasetAndPerformActions(page, coordinates, dataset, arrowValue, additionalContours) {

  console.log("coordinates are: " + coordinates);
  console.log("Dataset selected: " + dataset);
  console.log("Arrow value is: " + arrowValue);
  console.log("additional Contours is: " + additionalContours);
 
  // Wait for the button with the ID "enter-button" to become visible
  await page.waitForSelector('#enter-button', { visible: true });
  console.log('Button "enter-button" is visible on the page.');

  // Click on the button
  await page.click('#enter-button');
  console.log('Clicked on the button "enter-button".');
  await new Promise(r => setTimeout(r, 5000));

  // Wait for the modal to appear
  await page.waitForSelector('.modal-title');
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
  await new Promise(r => setTimeout(r, 2000));

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

  // Perform actions for entering coordinates
  for (const coord of coordinates) {
    console.log(coord[0],coord[1]);
    await enterCoordinates(page, coord[0], coord[1]);
  }

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

    await new Promise(r => setTimeout(r, 7000))

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

    await new Promise(r => setTimeout(r, 50000))

    //Click on Save Image Button
    await clickSaveImageButton(page, saveImageButtonId);

    await new Promise(r => setTimeout(r, 5000))

    //Generate CSV in Save Image Button
    await generateCSVSaveImageButton(page, saveImageButtonId);

    await new Promise(r => setTimeout(r, 5000))

    // Handle arrow value selection based on dataset
  // Handle arrow value selection based on dataset
  if (['GIOPS 10 day Forecast 3D - LatLon', 'RIOPS 10 day Forecast 3D - Polar Stereographic', 
    'CCG RIOPS Forecast Surface - LatLon', 'CIOPS Forecast East 3D - LatLon', 
    'CMEMS Global Ocean PHYS Reanalysis (Monthly 1/12) deg', 'WCPs-GLS Great Lakes'].includes(dataset)
     && arrowValue === 'magwatervel'
    ) {
    // Click on the option with value "magwatervel"

      // console.log(`Clicked on the option with value "${arrowValue}" inside the "Arrows" ComboBox.`);
      const arrowSelector = `option[value="${arrowValue}"][data-scale="0,3"][data-two_dimensional="false"][data-vector_variable="true"]`;

      // Wait for the option with the dynamic arrow value
      await page.waitForSelector(arrowSelector);
    
      // Click on the option element
      await page.evaluate((arrowSelector) => {
        const option = document.querySelector(arrowSelector);
        if (option) {
          option.selected = true;
          option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, arrowSelector);
    
      console.log(`Clicked on the option with value "${arrowValue}" inside the "Arrows" ComboBox.`);
    

    await new Promise(r => setTimeout(r, 8000));
    
  } else if (dataset === 'SalishSeaCast 3D currents' &&  additionalContours === 'uVelocity') {
    // Handle the case for 'SalishSeaCast 3D currents'
      const additionalContoursSelector  = `option[value="${additionalContours}"][data-scale="-3,3"][data-two_dimensional="false"][data-vector_variable="false"]`;
      // Wait for the option with the dynamic arrow value
      await page.waitForSelector(additionalContoursSelector);
    
      // Click on the option element
      await page.evaluate((additionalContoursSelector) => {
        const option = document.querySelector(additionalContoursSelector);
        if (option) {
          option.selected = true;
          option.parentElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, additionalContoursSelector);

    console.log(`Additional Contours - "${additionalContours}" Selected!`);

    await new Promise(r => setTimeout(r, 50000));
  }

  await new Promise(r => setTimeout(r, 5000))
  //Click on Save Image Button
  await clickSaveImageButton(page, saveImageButtonId);    

  await new Promise(r => setTimeout(r, 5000))

  //Generate CSV in Save Image Button
  await generateCSVSaveImageButton(page, saveImageButtonId);
      
  await new Promise(r => setTimeout(r, 5000))

  //Click on API Script Button
  await clickAPIScriptButton(page, APIScriptButtonId);    
    
  await new Promise(r => setTimeout(r, 5000))

  // Refresh the page
  await page.reload();
  await new Promise(r => setTimeout(r, 5000));
  console.log('Page reloaded.');
  

    
}

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
    await new Promise(r => setTimeout(r, 5000));

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

