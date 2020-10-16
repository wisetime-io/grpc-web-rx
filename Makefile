# Copyright (c) 2020 WiseTime. All rights reserved.

integration-test:
	@echo "- Run tests against local node server"
	npm test

test-generate-proto:
	@echo "- Clean proto-generated code"
	rm -rf src/generated
	@echo "- Generate gRPC Web TypeScript client from test_scenarios.proto"
	./scripts/build-client-proto.sh
	@echo "- Generate Node TypeScript stubs from test_scenarios.proto"
	./scripts/build-server-proto.sh

start-local-proxy:
	@echo "- Start local envoy proxy"
	./scripts/start-envoy-local.sh

init:
	npm ci

lint:
	npm run eslint

clean:
	rm -rf dist/
	rm -rf node_modules/
