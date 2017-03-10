import warnings
import matplotlib

# Force the non-interactive PNG backend
matplotlib.use('AGG')

# Use a font that supports unicode glyphs
matplotlib.rc('font', family='DejaVu Sans')

with warnings.catch_warnings():
    warnings.simplefilter('ignore', UserWarning)
    import matplotlib.pyplot
