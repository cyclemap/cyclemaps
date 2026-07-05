#!/bin/bash

echo 'to update'
echo '  docker pull node:26'
echo

./docker-run.sh node:26 npm "$@"

