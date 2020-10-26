#!/bin/bash

# envoy proxy container is already configured in ci
if [[ -z "${DRONE}" ]]; then
  BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
  cd ${BASEDIR}/../

  ENVOY_CONFIG=src/test/integration/envoy/envoy-local.yaml

  # attempt to stop existing envoy-local container (if exists)
  docker rm -f envoy-local

  case "$OSTYPE" in
  "linux-gnu")
    sed 's/$CLUSTER_HOST_ADDR/0.0.0.0/g' "$ENVOY_CONFIG" | tee /tmp/envoy.yaml
    docker run -d -v "/tmp/envoy.yaml:/etc/envoy/envoy.yaml:ro" --name envoy-local --network=host envoyproxy/envoy:v1.15.0
    ;;
  *)
    # https://github.com/grpc/grpc-web/issues/436
    sed 's/$CLUSTER_HOST_ADDR/host.docker.internal/g' "$ENVOY_CONFIG" | tee /tmp/envoy.yaml
    docker run -d -v "/tmp/envoy.yaml:/etc/envoy/envoy.yaml:ro" --name envoy-local -p 8081:8081 -p 9090:9090 envoyproxy/envoy:v1.15.0
    ;;
  esac
else
  echo "running in Drone, skipping local envoy proxy setup..."
  exit 0
fi
