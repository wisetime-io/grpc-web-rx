#!/bin/bash

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd ${BASEDIR}/../

PROTO_DIR=src/test/proto
OUTPUT_DIR=src/generated/client

[[ ! -d "$OUTPUT_DIR" ]] && mkdir -p "$OUTPUT_DIR"

if [[ -z "${DRONE}" ]]; then
    protoc -I="$PROTO_DIR" test_scenarios.proto \
      --js_out=import_style=commonjs,binary:"$OUTPUT_DIR" \
      --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUTPUT_DIR"
else
    /usr/bin/protoc -I="$PROTO_DIR" test_scenarios.proto \
        --js_out=import_style=commonjs,binary:"$OUTPUT_DIR" \
        --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUTPUT_DIR"
fi
