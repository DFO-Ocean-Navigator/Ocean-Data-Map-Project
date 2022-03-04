#!/usr/bin/env bash

echo ""
echo "Sorting imports..."
isort .

echo ""
echo "Formatting code..."
black .
