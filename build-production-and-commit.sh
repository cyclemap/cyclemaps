#!/bin/bash

set -e #exit on failure

./build-production.sh
git add dist/
git commit -m 'distribution.'

