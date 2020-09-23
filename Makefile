# Copyright (c) 2020 WiseTime. All rights reserved.

integration:
	@echo "- Start local envoy proxy"
	sh scripts/start-envoy-local.sh
	@echo "- Start node server"
	npm run start-server
	@echo "- Run tests against server"
	sleep 2 && npm test
	@echo "- Stop node server"
	npm run stop-server

test-generate-proto:
	@echo "- Clean proto-generated code"
	rm -rf src/generated
	@echo "- Generate gRPC Web TypeScript client from test_scenarios.proto"
	sh scripts/build-client-proto.sh
	@echo "- Generate Node TypeScript stubs from test_scenarios.proto"
	sh scripts/build-server-proto.sh

init:
	npm ci

clean:
	rm -rf dist/
	rm -rf node_modules/
