"""
Class for reading in the NAFC p-file (*.p2017, etc.) files.

Methods are available to convert the file to ODV-ASCII (Ocean Data Viewer),
or to use the file as a Pandas Dataframe.
"""
import dateutil
import numpy as np
import pandas as pd
import gsw

SHIP_NUMBERS = {
    "00": "Unknown",
    "01": "A.T.Cameron",
    "02": "Gadus",
    "03": "Shamook",
    "04": "Marinus",
    "05": "Kenda",
    "06": "Martin & Phillip",
    "07": "Zagreb",
    "08": "Burin Bay",
    "09": "Nfld Hawk",
    "10": "Tman",
    "11": "Hammond",
    "12": "Needler",
    "13": "Cindy Elizabeth",
    "14": "Balder Cabot",
    "15": "Specials",
    "16": "E.E.Prince",
    "17": "Lake Melville",
    "18": "Dawson",
    "19": "Karl & Jackie",
    "20": "Hudson",
    "21": "Parizeau",
    "22": "Petrel",
    "23": "Cormorant",
    "24": "Bernier",
    "25": "Hood",
    "26": "Mares",
    "27": "Ccg206",
    "28": "Adair",
    "29": "Lauzier",
    "30": "Nfld Lynx",
    "31": "Kingfisher",
    "32": "Surf",
    "33": "Roger",
    "34": "Explorer",
    "35": "Zandvoort",
    "36": "Aharvey",
    "37": "Larsen",
    "38": "Gilbert",
    "39": "Teleost",
    "40": "Whaler",
    "41": "Sentinal",
    "42": "Aclare",
    "44": "Lindsey",
    "45": "Grenfell",
    "48": "Cape Ballard",
    "49": "Pennysmart",
    "50": "Naka",
    "51": "Naka",
    "52": "Naka",
    "53": "Naka",
    "54": "Gilbertbay",
    "55": "Discovery",
    "59": "Pearkes",
    "60": "Celtic Explorer",
    "61": "Vladykov",
    "62": "Aqviq",
    "63": "Kinguk",
    "64": "Katsheshuk",
    "70": "Aquaculture",
    "80": "Afap80",
    "81": "Afap81",
    "82": "Afap82",
    "83": "Afap83",
    "84": "Afap84",
    "85": "Afap85",
    "86": "Afap86",
    "89": "Afap89",
    "90": "Meds Data",
    "91": "Olabs",
    "92": "French",
    "93": "Osc",
    "94": "Spanish",
    "95": "Meds Data",
    "96": "Meds Data",
    "AA": "Sent AA",
    "AB": "Sent AB",
    "AC": "Sent AC",
    "AD": "Sent AD",
    "AE": "Sent AE",
    "AF": "Sent AF",
    "AG": "Sent AG",
    "AH": "Sent AH",
    "AI": "Sent AI",
    "AJ": "Sent AJ",
    "AK": "Sent AK",
    "AL": "Sent AL",
    "AM": "Sent AM",
    "AN": "Sent AN",
    "AO": "Sent AO",
    "AP": "Sent AP",
    "AQ": "Sent AQ",
    "AR": "Sent AR",
    "AS": "Sent AS",
    "AT": "Sent AT",
    "AU": "Sent AU",
    "AV": "Sent AV",
    "AW": "Sent AW",
    "AX": "Sent AX",
    "AY": "Sent AY",
    "AZ": "Sent AZ",
}

ODV_COLUMN_ORDER = [
    "Cruise",
    "Station",
    "Type",
    "yyyy-mm-ddThh:mm:ss.sss",
    "Longitude [degrees_east]",
    "Latitude [degrees_north]",
    "Temperature [Celsius]",
    "Salinity [PSU]",
    "Conductivity [S/m]",
    "Sigma-t []",
    "Oxygen [ml/L]",
    "Fluorescence [mg/m^3]",
    "PAR []",
    "Ph []",
]


class PFile:
    def __init__(self, filename):
        self.filename = filename

        skip, names, colspecs = self._read_meta()
        self._read_file(skip, colspecs, names)

    def _read_meta(self):
        with open(self.filename, "r") as f:
            skip = []
            n = 0
            prevline = ""
            for line in f:
                if n == 1:
                    s = line.split()
                    latitude = float(s[1]) + np.sign(float(s[1])) * float(s[2]) / 60.0
                    longitude = float(s[3]) + np.sign(float(s[3])) * float(s[4]) / 60.0
                    ts = dateutil.parser.parse(s[5] + " " + s[6])
                    fid = s[0]
                if line == "-- DATA --\n":
                    names = prevline.split()

                if prevline == "-- DATA --\n":
                    # Compute colspecs
                    colspecs = []
                    digits = "1234567890"
                    start = 0
                    for m in range(1, len(line)):
                        if line[m] == " " and line[m - 1] in digits:
                            colspecs.append((start, m))
                            start = m + 1
                    break

                skip.append(n)
                n = n + 1
                prevline = line

            self.meta = {
                "timestamp": ts,
                "latitude": latitude,
                "longitude": longitude,
                "shipnumber": fid[0:2],
                "ship": SHIP_NUMBERS.get(fid[0:2]) or "Unknown",
                "trip": fid[2:5],
                "cast": fid[5:8],
                "id": fid,
            }

            return (skip, names, colspecs)

    def _read_file(self, skip, colspecs, names):
        self.dataframe = pd.read_fwf(
            self.filename,
            skiprows=skip,
            colspecs=colspecs,
            header=None,
            names=names,
            index_col=False,
        )

        if "pres" in self.dataframe.columns.values:
            self.dataframe["depth"] = abs(gsw.conversions.z_from_p(
                self.dataframe["pres"], self.meta["latitude"]
            ))

    def remove_upcast(self):
        df = self.dataframe
        idxmax = df["depth"].idxmax()
        df.drop(df.index[df.index > idxmax], inplace=True)

    def to_odv(self, filename):
        df = self._to_odv_df()
        columns = []
        for c in ODV_COLUMN_ORDER:
            if c in df.columns.values:
                columns.append(c)

        df.to_csv(filename, sep="\t", index=False, columns=columns)

    def _to_odv_df(self):
        df = pd.DataFrame()

        index = self.dataframe.index
        df["Cruise"] = pd.Series(
            "%s %s" % (self.meta["ship"].title(), self.meta["trip"]), index=index
        )
        df["Station"] = pd.Series(self.meta["cast"], index=index)
        df["Type"] = pd.Series("C", index=index)
        df["yyyy-mm-ddThh:mm:ss.sss"] = pd.Series(
            self.meta["timestamp"].isoformat(), index=index
        )
        df["Longitude [degrees_east]"] = pd.Series(self.meta["longitude"], index=index)
        df["Latitude [degrees_north]"] = pd.Series(self.meta["latitude"], index=index)

        column_mapping = {
            "temp": "Temperature [Celsius]",
            "sal": "Salinity [PSU]",
            "cond": "Conductivity [S/m]",
            "sigt": "Sigma-t []",
            "oxy": "Oxygen [ml/L]",
            "flor": "Fluorescence [mg/m^3]",
            "par": "PAR []",
            "ph": "pH []",
        }
        for key, value in column_mapping.items():
            if key in self.dataframe.columns.values:
                df[value] = self.dataframe[key]

        return df


def make_odv(files, filename):
    def fopen(f):
        pf = PFile(f)
        pf.remove_upcast()
        return pf._to_odv_df()

    dataframes = map(fopen, files)

    df = pd.concat(dataframes)

    columns = []
    for c in ODV_COLUMN_ORDER:
        if c in df.columns.values:
            columns.append(c)

    df.to_csv(filename, sep="\t", index=False, columns=columns)
