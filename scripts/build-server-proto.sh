#!/bin/bash

BASEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "${BASEDIR}/../" || exit

PROTO_DIR=src/test/proto
OUTPUT_DIR=src/generated/server

[[ ! -d "$OUTPUT_DIR" ]] && mkdir -p "$OUTPUT_DIR"

npx grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:"$OUTPUT_DIR" \
  --grpc_out=grpc_js:"$OUTPUT_DIR" \
  -I "$PROTO_DIR" test_scenarios.proto

npx grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=grpc_js:"$OUTPUT_DIR" \
  -I "$PROTO_DIR" test_scenarios.proto
