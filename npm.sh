#!/bin/bash

echo 'to update'
echo '  docker pull node:24'
echo

./docker-run.sh node:24 npm "$@"

