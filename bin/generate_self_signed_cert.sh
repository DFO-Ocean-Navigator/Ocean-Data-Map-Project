#!/usr/bin/env bash

echo "Generating a self-signed cert for 3650 days"

CERT_DIR=~/onav-cloud/self-signed-cert

mkdir -p $CERT_DIR

openssl req -x509 -newkey rsa:4096 -keyout $CERT_DIR/key.pem -out $CERT_DIR/cert.pem -days 3650 -nodes

