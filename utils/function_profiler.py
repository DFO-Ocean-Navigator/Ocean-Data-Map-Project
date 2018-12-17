import cProfile
from os import getcwd
from os.path import join

"""
    This function is used to profile an arbitrary function
    via decorator. It writes a .profile file with the
    function name as the file name. It also outputs the exact
    location of the file to the terminal so don't worry 
    about searching for it :P

    Courtesy of: https://stackoverflow.com/a/5376616/2231969

    Usage:
    Place @profileit above the function you wish to profile.

    Example:

    # Import our stuff
    from utils.function_profiler import profileit

    @profileit
    def my_function(some_argument):
    
    So now we have a file called my_function.profile most
    likely in our home directory (on Linux anyways).

    Easy peasy ;)

    Here is a link to help with manipulating the file:
    http://stefaanlippens.net/python_profiling_with_pstats_interactive_mode/
"""
def profileit(func):
    def wrapper(*args, **kwargs):
        datafn = func.__name__ + ".profile" # Name the data file sensibly
        prof = cProfile.Profile()
        retval = prof.runcall(func, *args, **kwargs)
        prof.dump_stats(datafn)
        print("// -----------------------------------")
        print(".profile file written to:")
        print(join(getcwd(), datafn))
        print("Run python -m pstats " + datafn + " to parse the stats.")
        print("// -----------------------------------")
        return retval

    return wrapper
