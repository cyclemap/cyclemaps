#!/bin/bash

docker run \
	--interactive \
	--rm \
	--user=$(id --user):$(id --group) \
	--env HOME=/home/docker \
	--volume=.:/home/docker \
	--workdir=/home/docker \
	"$@"


