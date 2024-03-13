#!/bin/bash

set -e #exit on failure

#first time: npm install
docker run --user=$(id --user):$(id --group) --rm --volume=.:/home --workdir=/home -it node:18 npm run build-production

