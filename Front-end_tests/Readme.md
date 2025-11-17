📘 Dataset Configuration (test_datasets.json)

The test_datasets.json file contains the full configuration for every dataset used in automated Playwright tests.
Each dataset entry defines how tests should behave for variable testing, area plots, line plots, subset exports, map tiles, and compare-mode testing.

This configuration ensures that tests adapt to differences between datasets, such as UI variations, available variables, plot types, and tile coordinates.

🔹 What Each Dataset Entry Contains

Each dataset object includes the following fields:

1. Basic Identification

name — Name of the dataset as shown in the UI.

id — Internal ID used to validate API tile responses.

Including the ID in tile API checks ensures the tile belongs to the correct dataset after switching variables.

2. Dataset Selector Steps

steps — The sequence of dropdown selections required to reach this dataset.

compare_dataset — The dataset used when running compare_test.spec.

compare_steps (optional) — Exact steps required to switch to the compare dataset.

3. Plot Testing Settings

csvPath — Path to the CSV file containing coordinates for area-plot testing.

subset_var — Variable used for subset-download (NetCDF) tests.

variables_to_test — Object mapping backend variable names → UI labels for variable switching tests.

4. Arrow & Contour Plot Handling

Some datasets display:

Arrows (e.g., Water Velocity)

Contours (e.g., Sea Surface Height)

Because the UI order of these checkboxes varies per dataset, we include:

arrow_box_position

contour_box_position

These numbers ensure tests click the correct UI element.

5. Line & Point Plot Tests

line_transect — "yes" or "no" depending on whether the dataset supports line transect plots.

line_coordinates — Prese(flemish_cap) or custom coordinates if preset not present for the dataset for line tests.

point_coordinates — Coordinates for point plot tests (lat, lon).

6. Tile Testing Information

tile_coordinates — Zoom level + tile X + tile Y.
Used during tile API validation to ensure the map renders correct data.


Area Test Overview

🔹 Opens the Edit Map Features window and verifies that it appears correctly.

🔹 Changes the upload type to Area and confirms the label updates to Polygon.

🔹 Uploads the dataset CSV file and verifies that the CSV content is displayed correctly.

🔹Listens for the backend area map plot request and verifies that the response status is 200.

🔹 Checks that the dataset in the selector updates correctly after plotting.

🔹 If a quiver variable is defined, selects it, listens for the backend quiver plot request, and verifies the response status.

🔹 If additional contours are defined, selects the contour option, listens for the contour plot request, and verifies the response status.

🔹 Enables dataset comparison, and if comparing with a non-default dataset, switches to the specified dataset.

🔹 vListens for the backend compare plot request and verifies that the final successful response returns 200.

Point Plot Test Overview

This test suite performs automated validation for each dataset by running a Point Plot Test.
The checks include:

🔹 3D Dataset Validation

Confirms the profile plot appears by verifying the backend’s /plot/profile response.

🔹 Virtual Mooring Plot

Ensures the Virtual Mooring timeseries plot loads successfully by checking the /plot/timeseries API response.

🔹 Dataset Switching

Verifies that the selected dataset actually changed by checking the visible dataset button name.

🔹 CSV Download Test

Confirms the backend returns a successful CSV download response.

Ensures the browser starts the file download and receives a valid filename.

🔹 API Script Download Test

Validates the backend’s /generate_script response for the API script.

Ensures the browser receives a downloadable file with a valid name.


  Line Test Overview

This test suite performs automated validation for each dataset by running a Line Plot Test.
The checks include:

🔹 Line Coordinates Handling

If the dataset does NOT include the preset Flemish Cap line, the test manually enters coordinates using the dataset’s line_coordinates values.

If the dataset does include the preset line, it uses the built-in option.

🔹 Line Plot Request

Listens for the backend line plot request and verifies the response status.

🔹 AZMP Line Validation (When Available)

For datasets supporting line transects, the test listens for the AZMP line request and validates the backend response.

For datasets without line transect support, this check is skipped.

🔹 Hovmöller Plot Verification

Ensures the Hovmöller plot request completes successfully by validating the backend response.

🔹 Dataset Switch Confirmation

Confirms that the selected dataset changed correctly by verifying the displayed dataset name.


Subset Download Test Overview

🔹Verifies the dataset switched correctly by checking the visible dataset button.

🔹Opens Edit Map Features and sets upload type to Area (handles the SalishSeaCast special-case combobox index).

🔹Uploads the dataset CSV and selects the uploaded feature.

🔹Clicks Plot Selected Features and selects the dataset’s subset variable.

🔹Enables Compress as *.zip (if required) and clicks Save.

🔹Listens for the backend /api/v2.0/subset request and verifies the response status is 200.

🔹Waits for the browser download event and confirms the downloaded file has a suggested filename.


Variable Test Overview


🔹Verifies the dataset switched correctly by checking the visible dataset button.

🔹 For each variable in variables_to_test:

🔹 Selects the variable from the Variable control.

🔹 Clicks Go and listens for the backend tile request for that dataset/variable + tile coordinates, and verifies the response is 200.

🔹 Listens for the backend scale request for that dataset/variable and verifies the response is 200.

🔹 Confirms the Variable control shows the selected variable label.