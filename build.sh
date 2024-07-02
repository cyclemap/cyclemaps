#!/bin/bash

set -e #exit on failure

#first time: ./install.sh
./npm.sh run build "$@"

