# Copyright (c) 2020 WiseTime. All rights reserved.

integration-test:
	npm test

test-local:
	@echo "- Run tests against local node server"
	$(MAKE) test-generate-proto
	# stop and remove local envoy proxy container (ignore error if container isn't found)
	docker stop envoy-local && docker rm -f envoy-local || true
	npm run start-local-server && sleep 2 && $(MAKE) start-local-proxy && sleep 2 && npm test && npm run stop-local-server

test-generate-proto:
	@echo "- Clean proto-generated code"
	rm -rf src/generated
	@echo "- Generate gRPC Web TypeScript client from test_scenarios.proto"
	./scripts/build-client-proto.sh
	@echo "- Generate Node TypeScript stubs from test_scenarios.proto"
	./scripts/build-server-proto.sh

start-local-proxy:
	./scripts/start-envoy-local.sh

build:
	npm run build

init:
	npm ci

lint:
	npm run eslint

clean:
	rm -rf dist/
	rm -rf node_modules/
