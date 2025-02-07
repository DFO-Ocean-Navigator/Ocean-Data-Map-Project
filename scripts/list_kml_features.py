import json
import xml.etree.ElementTree as ET
from pathlib import Path

kml_dir = Path("/data/kml")
subdirs = ["point", "line", "area"]
features = {"point": {}, "line": {}, "area": {}}

for subdir in subdirs:
    for f in kml_dir.joinpath(subdir).iterdir():
        root = ET.parse(f.as_posix()).getroot()
        nsmap = root.tag.split("}", 1)[0] + "}"
        for folder in root.iter(nsmap + "Folder"):
            for filename in folder.iter(nsmap + "name"):
                name = filename.text
                feature_names = []
                for placemark in folder.iter(nsmap + "Placemark"):
                    feature_names.append(placemark.find(nsmap + "name").text)
                features[subdir][name] = {"file": f.name, "features": feature_names}
                break

with open("kml_features.json", "w") as f:
    json.dump(features, f)
