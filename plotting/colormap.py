import os
import re
from io import BytesIO

import cmocean
import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
from flask_babel import gettext

import plotting


def make_colormap(seq):
    """
    Return a LinearSegmentedColormap: http://stackoverflow.com/a/16836182
    Args:
        seq: a sequence of floats and RGB-tuples. The floats should be increasing
        and in the interval (0,1).
    """
    seq = [(None,) * 3, 0.0] + list(seq) + [1.0, (None,) * 3]
    cdict = {'red': [], 'green': [], 'blue': []}
    for i, item in enumerate(seq):
        if isinstance(item, float):
            r1, g1, b1 = seq[i - 1]
            r2, g2, b2 = seq[i + 1]
            cdict['red'].append([item, r1, r2])
            cdict['green'].append([item, g1, g2])
            cdict['blue'].append([item, b1, b2])
    return mcolors.LinearSegmentedColormap('CustomMap', cdict)


def find_colormap(name):
    try:
        return colormaps[name.lower()]
    except KeyError:
        for key in colormaps:
            if re.search(key, name, re.I):
                return colormaps[key]
    return colormaps['mercator']


_c = mcolors.ColorConverter().to_rgb
data_dir = os.path.join(os.path.dirname(plotting.__file__), 'data')
colormaps = {
    'depth excess': cmocean.cm.deep,
    'ammonium concentration': cmocean.cm.matter,
    'nitrogen': cmocean.cm.balance,
    'dissolved organic nitrogen concentration': cmocean.cm.amp,
    'particulate organic nitrogen concentration': cmocean.cm.amp,
    'depth': cmocean.cm.deep,
    'deep': cmocean.cm.deep,
    'partial pressure': cmocean.cm.matter,
    'primary production': cmocean.cm.algae,
    'temp gradient': cmocean.cm.thermal,
    'heat': cmocean.cm.thermal,
    'density': cmocean.cm.dense,
    'curl': cmocean.cm.curl,
    'vorticity': cmocean.cm.curl,
    'divergence': cmocean.cm.curl,
    'bathymetry': cmocean.cm.deep,
    'salinity': cmocean.cm.haline,
    'speed': cmocean.cm.speed,
    'speed of current': cmocean.cm.speed,
    'freesurface': cmocean.cm.balance,
    'free surface': cmocean.cm.balance,
    'surface height': cmocean.cm.balance,
    'surface elevation': cmocean.cm.balance,
    'velocity': cmocean.cm.delta,
    'eastward current': cmocean.cm.delta,
    'northward current': cmocean.cm.delta,
    'waveheight': cmocean.cm.amp,
    'waveperiod': cmocean.cm.tempo,
    'chlorophyll': cmocean.cm.algae,
    'iron': cmocean.cm.amp,
    'oxygen': cmocean.cm.oxy,
    'phosphate': mcolors.ListedColormap(
        np.loadtxt(os.path.join(data_dir, 'phosphate.txt'))),
    'nitrate': mcolors.ListedColormap(
        np.loadtxt(os.path.join(data_dir, 'nitrate.txt'))),
    'nitrate concentration': cmocean.cm.tempo,
    'ice': cmocean.cm.ice,
    'phytoplankton': cmocean.cm.deep_r,
    'diatoms concentration as nitrogen': cmocean.cm.algae,
    'flagellates concentration as nitrogen': cmocean.cm.algae,
    'mesodinium rubrum concentration as nitrogen': cmocean.cm.algae,
    'mesozooplankton concentration as nitrogen': cmocean.cm.algae,
    'microzooplankton concentration as nitrogen': cmocean.cm.algae,
    'silicate': make_colormap([
        _c('#ffffff'),
        _c('#57a6bd'),
    ]),
    'silicon concentration': cmocean.cm.turbid,
    'biogenic silicon concentration': cmocean.cm.turbid,
    'ph': make_colormap([
        _c('#ED1B26'),
        _c('#F46432'), 0.1, _c('#F46432'),
        _c('#FFC324'), 0.2, _c('#FFC324'),
        _c('#84C341'), 0.3, _c('#84C341'),
        _c('#33A94B'), 0.4, _c('#33A94B'),
        _c('#0AB8B6'), 0.5, _c('#0AB8B6'),
        _c('#4591CD'), 0.6, _c('#4591CD'),
        _c('#5A51A2'), 0.7, _c('#5A51A2'),
        _c('#63459D'), 0.8, _c('#63459D'),
        _c('#6C2180'), 0.9, _c('#6C2180'),
        _c('#49176E')
    ]),
    'mercator_current': make_colormap([
        _c('#e1f3fc'),
        _c('#7ebce5'), 0.17, _c('#7ebce5'),
        _c('#4990bd'), 0.25, _c('#4990bd'),
        _c('#4eb547'), 0.42, _c('#4eb547'),
        _c('#f3e65b'), 0.55, _c('#f3e65b'),
        _c('#f58a35'), 0.67, _c('#f58a35'),
        _c('#d72928'), 0.83, _c('#d72928'),
        _c('#901418')
    ]),
    'mercator': make_colormap([
        _c('#1d3b7a'),
        _c('#134aaa'), 0.05, _c('#134aaa'),
        _c('#075ce4'), 0.10, _c('#075ce4'),
        _c('#1976fa'), 0.15, _c('#1976fa'),
        _c('#4b9bf1'), 0.20, _c('#4b9bf1'),
        _c('#80c0e7'), 0.25, _c('#80c0e7'),
        _c('#4dd9f0'), 0.30, _c('#4dd9f0'),
        _c('#1df1f9'), 0.35, _c('#1df1f9'),
        _c('#00efcf'), 0.40, _c('#00efcf'),
        _c('#04d273'), 0.45, _c('#04d273'),
        _c('#0cb20f'), 0.50, _c('#0cb20f'),
        _c('#66cf09'), 0.55, _c('#66cf09'),
        _c('#c8ed03'), 0.60, _c('#c8ed03'),
        _c('#fef000'), 0.65, _c('#fef000'),
        _c('#fed100'), 0.70, _c('#fed100'),
        _c('#feaf00'), 0.75, _c('#feaf00'),
        _c('#fe6a00'), 0.80, _c('#fe6a00'),
        _c('#fe2800'), 0.85, _c('#fe2800'),
        _c('#d80100'), 0.90, _c('#d80100'),
        _c('#a00000'), 0.95, _c('#a00000'),
        _c('#610000')
    ]),
    'anomaly': make_colormap([
        _c('#000064'),
        _c('#0000b2'), 0.090909, _c('#0000b2'),
        _c('#0000ff'), 0.181818, _c('#0000ff'),
        _c('#0748ff'), 0.272727, _c('#0748ff'),
        _c('#9291ff'), 0.363636, _c('#9291ff'),
        _c('#dbd9ff'), 0.454545, _c('#dbd9ff'),
        _c('#ffffff'), 0.500000, _c('#ffffff'),
        _c('#ffd9dd'), 0.545455, _c('#ffd9dd'),
        _c('#ff9193'), 0.636364, _c('#ff9193'),
        _c('#ff484a'), 0.727273, _c('#ff484a'),
        _c('#ff0000'), 0.818182, _c('#ff0000'),
        _c('#b20000'), 0.909091, _c('#b20000'),
        _c('#640000')
    ]),
    'temperature-old': make_colormap([
        _c('#0000ff'),
        _c('#0748ff'), 0.125, _c('#0748ff'),
        _c('#9291ff'), 0.250, _c('#9291ff'),
        _c('#dbd9ff'), 0.375, _c('#dbd9ff'),
        _c('#ffffff'), 0.500, _c('#ffffff'),
        _c('#ffd9dd'), 0.625, _c('#ffd9dd'),
        _c('#ff9193'), 0.750, _c('#ff9193'),
        _c('#ff484a'), 0.875, _c('#ff484a'),
        _c('#ff0000')
    ]),
    'grey': make_colormap([
        _c('#ffffff'),
        _c('#000000')
    ]),
    'thermal': cmocean.cm.thermal,
    'neo_sst': mcolors.ListedColormap(
        np.loadtxt(os.path.join(data_dir, 'neo_sst.txt'))),
    'BuYlRd': mcolors.ListedColormap(
        np.loadtxt(os.path.join(data_dir, 'BuYlRd.txt'))),
    'temperature': mcolors.ListedColormap(
        np.loadtxt(os.path.join(data_dir, 'temperature.txt'))),
}
colormaps['wind'] = colormaps['velocity']

# This is a little odd, but it has a purpose.
# These gettext calls don't really do anything, but it registers the keys with
# Babel so that they'll end up in the translation list.
# If the gettext calls were in the definition of colormap_names, they'd get
# executed before the user's locale is known and would always be in English.
gettext('Ammonium Concentration')
gettext('Anomaly')
gettext('Bathymetry')
gettext('Biogenic Silicon Concentration')
gettext('Chlorophyll')
gettext('Diatoms Concentration as Nitrogen')
gettext('Dissolved Organic Nitrogen Concentration')
gettext('Eastward Current')
gettext('Flagellates Concentration as Nitrogen')
gettext('Greyscale')
gettext('Ice')
gettext('Iron')
gettext('Mercator Ocean Current')
gettext('Mercator')
gettext('Mesodinium rubrum Concentration as Nitrogen')
gettext('Mesozooplankton Concentration as Nitrogen')
gettext('Microzooplankton Concentration as Nitrogen')
gettext('Nitrate')
gettext('Nitrate Concentration')
gettext('Northward Current')
gettext('Oxygen')
gettext('Particulate Organic Nitrogen Concentration')
gettext('Phosphate')
gettext('Phytoplankton')
gettext('Salinity')
gettext('Sea Surface Height (Free Surface)')
gettext('Silicate')
gettext('Silicon Concentration')
gettext('Speed')
gettext('Speed of Current')
gettext('Temperature')
gettext('Velocity')
gettext('Wave Height')
gettext('Wave Period')
gettext('Thermal')
gettext('NEO SST')
gettext('Color Brewer Blue-Yellow-Red')
gettext('Temperature (old)')
gettext('Vorticity')
gettext('Density')
gettext('Deep')
gettext('Balance')

colormap_names = {
    'ammonium concentration': 'Ammonium Concentration',
    'balance': 'Balance',
    'anomaly': 'Anomaly',
    'bathymetry': 'Bathymetry',
    'chlorophyll': 'Chlorophyll',
    'freesurface': 'Sea Surface Height (Free Surface)',
    'grey': 'Greyscale',
    'ice': 'Ice',
    'iron': 'Iron',
    'mercator_current': 'Mercator Ocean Current',
    'mercator': 'Mercator',
    'nitrate': 'Nitrate',
    'nitrate concentration': 'Nitrate Concentration',
    'dissolved organic nitrogen concentration': 'Dissolved Organic Nitrogen Concentration',
    'particulate organic nitrogen concentration': 'Particulate Organic Nitrogen Concentration',
    'oxygen': 'Oxygen',
    'phosphate': 'Phosphate',
    'phytoplankton': 'Phytoplankton',
    'diatoms concentration as nitrogen': 'Diatoms Concentration as Nitrogen',
    'flagellates concentration as nitrogen': 'Flagellates Concentration as Nitrogen',
    'mesodinium rubrum concentration as nitrogen': 'Mesodinium rubrum Concentration as Nitrogen',
    'mesozooplankton concentration as nitrogen': 'Mesozooplankton Concentration as Nitrogen',
    'microzooplankton concentration as nitrogen': 'Microzooplankton Concentration as Nitrogen',
    'salinity': 'Salinity',
    'silicate': 'Silicate',
    'silicon concentration': 'Silicon Concentration',
    'biogenic silicon concentration': 'Biogenic Silicon Concentration',
    'speed': 'Speed',
    'speed of current': 'Speed of Current',
    'temperature': 'Temperature',
    'velocity': 'Velocity',
    'eastward current': 'Eastward Current',
    'northward current': 'Northward Current',
    'waveheight': 'Wave Height',
    'waveperiod': 'Wave Period',
    'thermal': 'Thermal',
    'neo_sst': 'NEO SST',
    'BuYlRd': 'Color Brewer Blue-Yellow-Red',
    'temperature-old': 'Temperature (old)',
    'vorticity': 'Vorticity',
    'density': 'Density',
    'deep': 'Deep'
}


def plot_colormaps():
    fig, axes = plt.subplots(
        nrows=len(colormap_names),
        figsize=(11, 0.3 * len(colormap_names))
    )
    fig.subplots_adjust(top=0.925, bottom=0.01, left=0.01, right=0.6)

    gradient = np.linspace(0, 1, 256)
    gradient = np.vstack((gradient, gradient))

    fig.suptitle(gettext("Ocean Navigator Colourmaps"), fontsize=14)
    for ax, cmap in zip(axes, sorted(colormap_names, key=colormap_names.get)):
        ax.imshow(gradient, aspect='auto', cmap=colormaps.get(cmap))
        pos = list(ax.get_position().bounds)
        x_text = pos[2] + 0.025
        y_text = pos[1] + pos[3] / 2.
        fig.text(
            x_text, y_text, colormap_names[cmap], va='center', ha='left', fontsize=12
        )

    for ax in axes:
        ax.set_axis_off()

    buf = BytesIO()
    try:
        plt.savefig(buf, format="png", dpi='figure')
        plt.close(fig)
        return buf.getvalue()
    finally:
        buf.close()


if __name__ == '__main__':
    import viscm
    import matplotlib.cm
    import sys

    for k, v in colormaps.items():
        matplotlib.cm.register_cmap(name=k, cmap=v)

    maps = [i for i in colormaps]
    if len(sys.argv) > 1:
        maps = sys.argv[1:]

    for m in maps:
        v = viscm.viscm(m, uniform_space="CAM02-UCS")
        v.fig.set_size_inches(20, 12)
        v.fig.savefig(m + ".png")
