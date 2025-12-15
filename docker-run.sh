#!/bin/bash

docker run \
	--interactive \
	--tty \
	--rm \
	--user=$(id --user):$(id --group) \
	--env HOME=/home/docker \
	--volume=.:/home/docker/run \
	--workdir=/home/docker/run \
	"$@"


