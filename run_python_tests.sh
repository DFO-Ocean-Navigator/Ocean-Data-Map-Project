#!/usr/bin/env bash

python -m unittest $(find tests -name "*.py" | grep -v disabled)
