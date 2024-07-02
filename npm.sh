#!/bin/bash

set -e #exit on failure

docker run --user=$(id --user):$(id --group) --rm --volume=.:/home --workdir=/home -it node:22 npm "$@"

