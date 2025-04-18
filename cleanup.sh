#!bin/bash

echo "Cleaning up old build files and volumes that are not in use..."
docker images prune -a
docker system prune -a --volumes --force
docker builder prune --all --force

echo "checking the docker system usage..."
docker system df