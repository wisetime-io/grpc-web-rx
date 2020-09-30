#!/bin/sh

# envoy proxy container is already configured in ci
if [ "$DRONE" == true ]; then
  echo "running in Drone, skipping local envoy proxy setup..."
  exit 0
fi

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd ${BASEDIR}/../

ENVOY_CONFIG=src/test/integration/envoy/envoy.yaml

# attempt to stop existing envoy-local container (if exists)
docker rm -f envoy-local

if [ "$OSTYPE" != "linux-gnu"* ]; then
  # https://github.com/grpc/grpc-web/issues/436
  sed 's/$CLUSTER_HOST_ADDR/host.docker.internal/g' "$ENVOY_CONFIG" | tee /tmp/envoy.yaml
  docker run -d -v "/tmp/envoy.yaml:/etc/envoy/envoy.yaml:ro" \
    --name envoy-local -p 8080:8080 -p 9090:9090 envoyproxy/envoy:v1.15.0
else
  sed 's/$CLUSTER_HOST_ADDR/0.0.0.0/g' "$ENVOY_CONFIG" | tee /tmp/envoy.yaml
  docker run -d -v "/tmp/envoy.yaml:/etc/envoy/envoy.yaml:ro" \
    --name envoy-local --network=host envoyproxy/envoy:v1.15.0
fi
