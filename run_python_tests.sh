#!/usr/bin/env bash

python -m pytest -v $(find tests -name "*.py" | grep -v disabled)
