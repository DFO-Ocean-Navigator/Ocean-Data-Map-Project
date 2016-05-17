import matplotlib.colors as mcolors
import cmocean
import re


def make_colormap(seq):
    """Return a LinearSegmentedColormap
    seq: a sequence of floats and RGB-tuples. The floats should be increasing
    and in the interval (0,1).

    http://stackoverflow.com/a/16836182
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
    for key in colormaps.keys():
        if re.search(key, name, re.I):
            return colormaps[key]
    return colormaps['mercator']

_c = mcolors.ColorConverter().to_rgb
colormaps = {
    'bathymetry': cmocean.cm.bathymetry,
    'transparent_gray': mcolors.LinearSegmentedColormap.from_list(
        'transparent_gray',
        [(0, 0, 0, 0.5), (0, 0, 0, 0.1)]),
    'salinity': cmocean.cm.salinity,
    'speed': cmocean.cm.speed,
    'temperature': make_colormap([
        (0, 0, 1),
        (1, 0, 0)
    ]),
    'freesurface': cmocean.cm.freesurface,
    'free surface': cmocean.cm.freesurface,
    'velocity': cmocean.cm.velocity,
    'waveheight': cmocean.cm.waveheight,
    'waveperiod': cmocean.cm.waveperiod,
    'ice': make_colormap([
        _c('#1d3b7a'),
        _c('#f3fafe')
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
    'eugene': make_colormap([
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
    ])
}
colormaps['temperature'] = colormaps['eugene']
colormaps['anomaly'] = colormaps['eugene']
