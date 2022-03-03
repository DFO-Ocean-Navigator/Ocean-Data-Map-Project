#!/usr/bin/env python

import json
from functools import lru_cache, wraps

from frozendict import frozendict


def freeze_args(func):
    """Decorator to transform mutable dictionnary into immutable.
    Useful to be compatible with cache.

    Note: Does NOT work on kwargs containing non-hashable
        types (e.g. list).

    Usage:
        @freeze_args
        def my_function(arg1, arg2):
            ...
    """

    @wraps(func)
    def wrapped(*args, **kwargs):
        args = tuple(
            [frozendict(arg) if isinstance(arg, dict) else arg for arg in args]
        )
        kwargs = {
            k: frozendict(v) if isinstance(v, dict) else v for k, v in kwargs.items()
        }

        return func(*args, **kwargs)

    wrapped.cache_info = func.cache_info
    wrapped.cache_clear = func.cache_clear

    return wrapped


def hashable_lru(func):
    """Decorator to auto-magically cache the return
    values of a function. It uses json serialisation
    to account for un-hashable types (e.g. list); an
    improvement over the default lru_cache decorator.

    It uses an LRU cache internally with a maxsize of 16.

    Robbed from: https://stackoverflow.com/a/46590069/2231969

    Usage:
        @hashable_lru
        def my_expensive_function(arg1, arg2):
            ...
    """

    cache = lru_cache(maxsize=16)

    def deserialise(value):
        try:
            return json.loads(value)
        except Exception:
            return value

    def func_with_serialized_params(*args, **kwargs):
        _args = tuple([deserialise(arg) for arg in args])
        _kwargs = {k: deserialise(v) for k, v in kwargs.items()}
        return func(*_args, **_kwargs)

    cached_function = cache(func_with_serialized_params)

    @wraps(func)
    def lru_decorator(*args, **kwargs):
        _args = tuple(
            [
                json.dumps(arg, sort_keys=True) if type(arg) in (list, dict) else arg
                for arg in args
            ]
        )
        _kwargs = {
            k: json.dumps(v, sort_keys=True) if type(v) in (list, dict) else v
            for k, v in kwargs.items()
        }
        return cached_function(*_args, **_kwargs)

    lru_decorator.cache_info = cached_function.cache_info
    lru_decorator.cache_clear = cached_function.cache_clear

    return lru_decorator
