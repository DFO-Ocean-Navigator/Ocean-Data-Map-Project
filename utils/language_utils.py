from typing import Any, get_type_hints


def return_type(f):
	try:
		return get_type_hints(f).get('return', Any)
	except TypeError:
		return Any
		