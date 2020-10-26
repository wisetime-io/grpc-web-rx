# Copyright (c) 2020 WiseTime. All rights reserved.

integration-test:
	npm test

test-local:
	@echo "- Run tests against local node server"
	npm run test-local

test-generate-proto:
	@echo "- Clean proto-generated code"
	rm -rf src/generated
	@echo "- Generate gRPC Web TypeScript client from test_scenarios.proto"
	./scripts/build-client-proto.sh
	@echo "- Generate Node TypeScript stubs from test_scenarios.proto"
	./scripts/build-server-proto.sh

build:
	npm run build

init:
	npm ci

lint:
	npm run eslint

clean:
	rm -rf dist/
	rm -rf node_modules/
