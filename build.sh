#!bin/bash

echo "Cleaning up old build filse and volume that are not in used..."
# docker image prune
docker volume prune
docker container prune -f

echo "building the docker image.."
docker-compose up --build

docker builder prune --all