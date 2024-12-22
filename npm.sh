#!/bin/bash

set -e #exit on failure

docker run \
	--interactive \
	--tty \
	--rm \
	--user=$(id --user):$(id --group) \
	--volume=.:/home \
	--workdir=/home \
	node:22 npm "$@"

