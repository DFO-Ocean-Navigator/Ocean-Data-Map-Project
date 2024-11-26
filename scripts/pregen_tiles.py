#!/usr/bin/env python3

import argparse
import multiprocessing
from itertools import product

import requests

parser = argparse.ArgumentParser(description="Warm up the tile cache.")
parser.add_argument(
    "--url",
    type=str,
    required=True,
    help=(
        "Root URL to Navigator instance. Ex: "
        + "https://oceannavigator.ca or http://10.5.166.251:5000"
    ),
)
args = parser.parse_args()

base_url = f"{args.url}/api/v2.0"


def get_tile(
    dataset: str,
    variable: str,
    time: int,
    depth: int,
    scale: str,
    x: int,
    y: int,
    z: int,
) -> None:
    res = requests.get(
        f"{base_url}/tiles/gaussian/25/10/EPSG:3857/{dataset}/{variable}/{time}/{depth}/{scale}/{z}/{x}/{y}.png",
        timeout=25,
        verify=False,
    )

    if res.status_code != 200:
        print(f"Error getting tile {res.status_code} -- {res.url}")
    else:
        print(f"Fetched {res.url}")


if __name__ == "__main__":
    print(f"Starting with {multiprocessing.cpu_count()} processes...")

    datasets = list(
        filter(
            lambda d: "riops" in d or "giops" in d,
            map(
                lambda d: d["id"],
                requests.get(f"{base_url}/datasets").json(),
                verify=False,
            ),
        )
    )

    timestamps = list(
        map(
            lambda t: int(t["id"]),
            requests.get(
                f"{base_url}/timestamps/?dataset=giops_day&variable=votemper",
                verify=False,
            ).json(),
        )
    )

    zoom_levels = [z for z in range(1, 8)]
    x_range = [x for x in range(0, 8)]
    y_range = [y for y in range(0, 8)]

    nc_timestamp = [timestamps[0]]

    print(f"Fetching tiles for {nc_timestamp}")

    time = nc_timestamp
    depth = [0]

    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        res1 = pool.starmap_async(
            get_tile,
            product(
                datasets,
                ["vozocrtx", "vomecrty"],
                time,
                depth,
                ["-3,3"],
                x_range,
                y_range,
                zoom_levels,
            ),
        )
        res2 = pool.starmap_async(
            get_tile,
            product(
                datasets,
                ["magwatervel"],
                time,
                depth,
                ["0,3"],
                x_range,
                y_range,
                zoom_levels,
            ),
        )
        res3 = pool.starmap_async(
            get_tile,
            product(
                datasets,
                ["votemper"],
                time,
                depth,
                ["-5,30"],
                x_range,
                y_range,
                zoom_levels,
            ),
        )
        res4 = pool.starmap_async(
            get_tile,
            product(
                datasets,
                ["vosaline"],
                time,
                depth,
                ["30,40"],
                x_range,
                y_range,
                zoom_levels,
            ),
        )

        res1.get()
        res2.get()
        res3.get()
        res4.get()

    print("Done!")
