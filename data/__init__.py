from data import Data
import nemo


def open_dataset(url):
    return nemo.Nemo(url)
