import csv
import getopt
import json
import logging
import os
import shutil
import sys
import time
from urllib.parse import urlencode

import numpy as np
import requests


class ONav_Profiling_Driver:
    def __init__(
        self,
        base_url,
        config_url,
        csv_file,
        prof_path,
        user_id,
        max_attempts=1,
        max_time=120,
    ):
        """
        Initializes the profiling driver. Input arguments are:

        base_url: the url of the Navigator intance being profiled
        config_url: the filepath/name of the configuration file
        user_id: a unique identifier for output file names
        prof_path: the path to the directory containing server profiling results
        max_attempts: the number of attempts allowed to connect to API endpoints
                      (default 1)
        max_time: the maxium time to wait for a response in seconds (default 120)
        """
        if base_url[-1] == "/":
            base_url = base_url[:-1]
        self.base_url = base_url.split("//")[1]
        self.api_url = base_url + "/api/v2.0/"
        self.csv_file = csv_file
        self.user_id = user_id
        self.prof_path = prof_path
        self.max_attempts = max_attempts
        self.max_time = max_time
        self.git_hash = self.get_git_hash()
        self.start_time = time.time()
        self.log_filename = f"/dev/shm/{self.user_id}_{self.base_url}_api_profiling_{self.format_time(self.start_time)}.log"
        self.results = []

        logging.basicConfig(
            filename=self.log_filename,
            level=logging.DEBUG,
            format="%(created)f %(asctime)s %(levelname)s \n %(message)s",
            datefmt="%H:%M:%S",
        )
        logging.getLogger().addHandler(logging.StreamHandler())
        logging.info(
            "\n****************** Starting Profile Driver ******************\n"
        )

        with open(config_url) as f:
            self.test_config = json.load(f)
            self.test_list = list(self.test_config.keys())

    def send_req(self, url):
        """
        This method sends the requests to the given url and logs the results and time
        taken. It also handles and logs raised exceptions.
        """
        logging.info(f"URL: {url}")
        for i in range(self.max_attempts):
            logging.info(f"Attempt {i+1}:")
            start_time = time.time()
            try:
                resp = requests.get(url, timeout=self.max_time, verify=False)
                end_time = time.time()

                if resp.status_code == 200:
                    total_time = end_time - start_time
                    if total_time < 1:
                        time.sleep(1)
                    logging.info(
                        f"*** Response recieved. ***\n Total request time: \
                            {total_time} seconds."
                    )
                    return resp, start_time, total_time
                elif resp.status_code == 500:
                    logging.info(f"*** Request failed. ***\n{resp.content}")
                elif resp.status_code == 504:
                    logging.info(
                        f"*** Server timed-out after {end_time-start_time} seconds. ***"
                    )
                else:
                    logging.warning("*** Request failed. ***\nReason unknown.")
            except requests.ReadTimeout:
                end_time = time.time()
                logging.warning(
                    f"*** Client timed out after {end_time-start_time} seconds \
                        (max_time = {self.max_time} seconds). ***"
                )
            except requests.exceptions.ConnectionError:
                logging.warning("*** Connection aborted. ***")
        logging.critical(
            f"Could not complete request after {self.max_attempts} attempt(s)."
        )
        return [], start_time, np.nan

    def get_datasets(self):
        logging.info("Requesting dataset meta data...")
        data, _, _ = self.send_req(self.api_url + "datasets")
        if data:
            return [d for d in json.loads(data.content)]

    def get_variables(self, dataset):
        logging.info("Requesting variables...")
        data, _, _ = self.send_req(self.api_url + f"dataset/{dataset}/variables")
        if data:
            return [d for d in json.loads(data.content)]

    def get_timestamps(self, dataset, variable):
        logging.info("Requesting timestamps...")
        data, _, _ = self.send_req(
            self.api_url + f"dataset/{dataset}/{variable}/timestamps"
        )
        if data:
            return [d for d in json.loads(data.content)]

    def get_depths(self, dataset, variable):
        logging.info("Requesting depths...")
        data, _, _ = self.send_req(
            self.api_url + f"/dataset/{dataset}/{variable}/depths"
        )
        if data:
            return [d for d in json.loads(data.content)]

    def get_plot(self, plot_type, query):
        logging.info("Requesting plot...")
        return self.send_req(
            self.api_url
            + f"plot/{plot_type}?"
            + urlencode({"query": json.dumps(query)})
            + "&format=json"
        )

    def get_subset(self, dataset, variable, query):
        logging.info("Requesting subset...")
        url = self.api_url + f"subset/{dataset}/{variable}?"
        for key in query:
            url += f"&{key}={query[key]}"
        return self.send_req(url)

    def get_git_hash(self):
        resp = requests.get(
            self.api_url + "gitinfo", timeout=self.max_time, verify=False
        )
        if resp.status_code == 200:
            return json.loads(resp.content)
        return ""

    def format_time(self, in_time):
        if np.isnan(in_time):
            return in_time
        return time.strftime("%Y.%m.%d_%H.%M.%S", time.gmtime(in_time))

    def profile_test(self):
        logging.info("\n****************** Profiling Profile Plot ******************\n")
        config = self.test_config["profile_plot"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    _, start_time, resp_time = self.get_plot(
                        "profile",
                        {
                            "dataset": ds,
                            "names": [],
                            "plotTitle": "",
                            "quantum": config["datasets"][ds]["quantum"],
                            "showmap": 0,
                            "station": config["station"],
                            "time": timestamps[-1]["id"],
                            "variable": v,
                        },
                    )

                    self.results.append(["profile", ds, v, start_time, resp_time])
                else:
                    self.results.append(["profile", ds, v, np.nan, np.nan])

    def virtual_mooring_test(self):
        logging.info(
            "\n****************** Profiling Virtual Mooring Plot ******************\n"
        )
        config = self.test_config["vm_plot"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    start_idx = len(timestamps) - config["datasets"][ds]["n_timestamps"]

                    _, start_time, resp_time = self.get_plot(
                        "timeseries",
                        {
                            "colormap": "default",
                            "dataset": ds,
                            "depth": 0,
                            "endtime": timestamps[-1]["id"],
                            "names": [],
                            "plotTitle": "",
                            "quantum": config["datasets"][ds]["quantum"],
                            "scale": "-5,30,auto",
                            "showmap": 0,
                            "starttime": timestamps[start_idx]["id"],
                            "station": config["station"],
                            "variable": v,
                        },
                    )

                    self.results.append(
                        ["virtual mooring", ds, v, start_time, resp_time]
                    )
                else:
                    self.results.append(["virtual mooring", ds, v, np.nan, np.nan])

    def transect_test(self):
        logging.info(
            "\n****************** Profiling Transect Plot ******************\n"
        )
        config = self.test_config["transect_plot"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    _, start_time, resp_time = self.get_plot(
                        "transect",
                        {
                            "colormap": "default",
                            "dataset": ds,
                            "depth_limit": 0,
                            "linearthresh": 200,
                            "name": config["datasets"][ds]["name"],
                            "path": config["datasets"][ds]["path"],
                            "plotTitle": "",
                            "quantum": config["datasets"][ds]["quantum"],
                            "scale": "-5,30,auto",
                            "selectedPlots": "0,1,1",
                            "showmap": 1,
                            "surfacevariable": "none",
                            "time": timestamps[-1]["id"],
                            "variable": v,
                        },
                    )

                    self.results.append(["transect", ds, v, start_time, resp_time])
                else:
                    self.results.append(["transect", ds, v, np.nan, np.nan])

    def hovmoller_test(self):
        logging.info(
            "\n****************** Profiling Hovmoller Plot ******************\n"
        )
        config = self.test_config["hovmoller_plot"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    start_idx = len(timestamps) - config["datasets"][ds]["n_timestamps"]

                    _, start_time, resp_time = self.get_plot(
                        "hovmoller",
                        {
                            "colormap": "default",
                            "dataset": ds,
                            "depth": 0,
                            "endtime": timestamps[-1]["id"],
                            "name": config["datasets"][ds]["name"],
                            "path": config["datasets"][ds]["path"],
                            "plotTitle": "",
                            "quantum": config["datasets"][ds]["quantum"],
                            "scale": "-5,30,auto",
                            "showmap": 1,
                            "starttime": timestamps[start_idx]["id"],
                            "variable": v,
                        },
                    )

                    self.results.append(["hovmoller", ds, v, start_time, resp_time])
                else:
                    self.results.append(["hovmoller", ds, v, np.nan, np.nan])

    def area_test(self):
        logging.info("\n****************** Profiling Area Plot ******************\n")
        config = self.test_config["area_plot"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    _, start_time, resp_time = self.get_plot(
                        "map",
                        {
                            "area": [
                                {
                                    "innerrings": [],
                                    "name": "",
                                    "polygons": config["datasets"][ds]["polygons"],
                                }
                            ],
                            "bathymetry": 1,
                            "colormap": "default",
                            "contour": {
                                "colormap": "default",
                                "hatch": 0,
                                "legend": 1,
                                "levels": "auto",
                                "variable": "none",
                            },
                            "dataset": ds,
                            "depth": 0,
                            "interp": "gaussian",
                            "neighbours": 10,
                            "projection": "EPSG:3857",
                            "quantum": config["datasets"][ds]["quantum"],
                            "quiver": {
                                "colormap": "default",
                                "magnitude": "length",
                                "variable": config["datasets"][ds]["quiver_variable"],
                            },
                            "radius": 25,
                            "scale": "-5,30,auto",
                            "showarea": 1,
                            "time": timestamps[-1]["id"],
                            "variable": v,
                        },
                    )

                    self.results.append(["area", ds, v, start_time, resp_time])
                else:
                    self.results.append(["area", ds, v, np.nan, np.nan])

    def subset_test(self):
        logging.info("\n****************** Profiling Area Subset ******************\n")
        config = self.test_config["area_subset"]

        for ds in config["datasets"]:
            logging.info(f"\nDataset: {ds}\n")
            for v in config["datasets"][ds]["variables"]:
                logging.info(f"Variable: {v}")
                timestamps = self.get_timestamps(ds, v)

                if timestamps:
                    _, start_time, resp_time = self.get_subset(
                        ds,
                        v,
                        {
                            "output_format": "NETCDF4",
                            "max_range": config["datasets"][ds]["max_range"],
                            "min_range": config["datasets"][ds]["min_range"],
                            "should_zip": 1,
                            "time": ",".join(
                                [str(timestamps[-1]["id"]), str(timestamps[-1]["id"])]
                            ),
                            "user_grid": 0,
                        },
                    )

                    self.results.append(["subset", ds, v, start_time, resp_time])
                else:
                    self.results.append(["subset", ds, v, np.nan, np.nan])

    def obs_test(self):
        logging.info(
            "\n****************** Profiling Observation Plot ******************\n"
        )
        config = self.test_config["obs_plot"]

        for o in config["obs_id"]:
            logging.info(f"Observation ID: {o}")

            _, start_time, resp_time = self.get_plot(
                "observation",
                {
                    "dataset": "giops_day",
                    "names": [],
                    "observation": o,
                    "observation_variable": [0],
                    "plotTitle": "",
                    "quantum": "day",
                    "variable": ["votemper"],
                },
            )

            self.results.append(["observation", o, "", start_time, resp_time])

    def class4_test(self):
        logging.info("\n****************** Profiling Class4 Plot ******************\n")
        config = self.test_config["class4_plot"]

        for c in config["class4id"]:
            logging.info(f"Class4 ID: {c}")

            _, start_time, resp_time = self.get_plot(
                "class4",
                {
                    "class4id": [c],
                    "class4type": "ocean_predict",
                    "climatology": 0,
                    "dataset": "giops_day",
                    "error": "none",
                    "forecast": "best",
                    "models": [],
                    "showmap": 0,
                },
            )

            self.results.append(["class4", c, "", start_time, resp_time])

    def get_profile_paths(self):
        prof_files = os.listdir(self.prof_path)
        plot_profs = [p for p in prof_files if "plot" in p]
        plot_times = np.array([p.split(".")[-2] for p in plot_profs]).astype(int)
        for row in self.results:
            if row[0] != "Dataset" and not np.isnan(row[-1]):
                if self.prof_path:
                    time = row[-2]
                    diff = plot_times - np.floor(time)
                    diff_times = plot_times[np.where(diff >= 0)]
                    min_diff = np.min(diff_times)
                    prof_name = [i for i in plot_profs if str(min_diff) in i][0]
                    row.append(prof_name)
            elif row[0] != "Dataset" and np.isnan(row[-1]):
                row.append("")

    def write_csv(self):
        if self.csv_file:
            csv_name = self.csv_file
        else:
            csv_name = f"{self.user_id}_{self.base_url}_api_profiling_{self.format_time(self.start_time)}.csv"

        with open(csv_name, "a", newline="") as csvfile:
            writer = csv.writer(csvfile, delimiter=",")

            if os.stat(csv_name).st_size == 0:
                writer.writerow(
                    [
                        "URL",
                        "Test",
                        "Dataset",
                        "Variable",
                        "Git Hash",
                        "Start Time",
                        "Response Time (s)",
                        "Profile File Path",
                    ]
                )
            for row in self.results:
                if self.prof_path:
                    writer.writerow(
                        [
                            self.base_url,
                            *row[:3],
                            self.git_hash,
                            self.format_time(row[3]),
                            f"{row[4]:.4f}",
                            row[5],
                        ]
                    )
                else:
                    writer.writerow(
                        [
                            self.base_url,
                            *row[:3],
                            self.git_hash,
                            self.format_time(row[3]),
                            f"{row[4]:.4f}",
                            "",
                        ]
                    )

    def run(self):
        logging.info(
            f"Profile testing start time: {time.ctime(self.start_time)} \
                ({self.start_time:.0f})."
        )

        if "profile_plot" in self.test_list:
            self.profile_test()
        if "vm_plot" in self.test_list:
            self.virtual_mooring_test()
        if "transect_plot" in self.test_list:
            self.transect_test()
        if "hovmoller_plot" in self.test_list:
            self.hovmoller_test()
        if "area_plot" in self.test_list:
            self.area_test()
        if "area_subset" in self.test_list:
            self.subset_test()
        if "obs_plot" in self.test_list:
            self.obs_test()
        if "class4_plot" in self.test_list:
            self.class4_test()

        end_time = time.time()
        logging.info(
            f"Profile testing start time:  {time.ctime(self.start_time)} \
                ({self.start_time:.0f})."
        )
        logging.info(f"Profile testing end time:  {time.ctime(end_time)} ({end_time}).")
        logging.info(
            f"Time to complete all tests: {(end_time - self.start_time):.0f} seconds."
        )

        shutil.move(self.log_filename, os.getcwd())

        if self.prof_path:
            self.get_profile_paths()

        self.write_csv()


if __name__ == "__main__":
    """
    The api_profiling_driver scripts is intendend to target Ocean Navigator API
    endpoints as specified in a configuration file so that profiles for these functions
    can be collected for performance analysis while collecting client-side metrics for
    each. This script can log the status of each request and produce a csv file
    contained the tabulated results (enabled by default). It is designed to be run from
    the command line with flags specifying file locaitons and options as described in
    the example below:

    python api_profiling_driver.py --url https://navigator.oceansdata.ca
        --config api_profiling_config.json --id usr -a 1 -t 120

    where:

    --url: the url of the Navigator instance that's being profiled
    --config: the path of configuration file
    --csv: the path of csv file for output data (Optional, one will be created if not
            provided)
    --prof: the path to the directory containing server profiling results (Optional,
            requires running script on server with Navigator, or remote access to
            /profiler_results/)
    --id: a unique user identifer for output file names
    -a: the number of attempts to reach each end point allowed
    -t: the maxium time to wait for a response from each endpoint
    """

    # default options
    url = "https://navigator.oceansdata.ca"
    config = "scripts/profiling_scripts/api_profiling_config.json"
    csv_file = None
    prof_path = None
    usr_id = "test_usr"
    max_attempts = 1
    max_time = 120

    try:
        opts, args = getopt.getopt(
            sys.argv[1:], ":a:t:", ["url=", "config=", "csv=", "prof=", "id="]
        )
    except getopt.GetoptError as err:
        print(err)
        sys.exit()

    for o, a in opts:
        if o == "--url":
            url = a
        elif o == "--config":
            config = a
        elif o == "--prof":
            prof_path = a
        elif o == "--id":
            usr_id = a
        elif o == "-a":
            max_attempts = int(a)
        elif o == "-t":
            max_time = int(a)
        elif o == "-l":
            enable_logging = False
        elif o == "-c":
            save_csv = False

    api_profiler = ONav_Profiling_Driver(
        url, config, csv_file, prof_path, usr_id, max_attempts, max_time
    )

    api_profiler.run()
