from typing import get_type_hints, Any

def return_type(f):
	try:
		return get_type_hints(f).get('return', Any)
	except TypeError:
		return Any
		