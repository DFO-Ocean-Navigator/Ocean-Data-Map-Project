from enum import Enum


class ScriptLang(str, Enum):
    python = "python"
    r = "r"


class ScriptType(str, Enum):
    plot = "plot"
    csv = "csv"
    subset = "subset"


class InterpolationType(str, Enum):
    gaussian = "gaussian"
    bilinear = "bilinear"
    inverse = "inverse"
    nearest = "nearest"
