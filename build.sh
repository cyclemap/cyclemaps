#!/bin/bash

set -e #exit on failure

rm -rf dist/assets

#first time: npm install
npm run build

