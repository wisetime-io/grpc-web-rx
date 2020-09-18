# Copyright (c) 2020 WiseTime. All rights reserved.

test: clean test-generate-proto
	@echo "TODO:"
	@echo "- Start Node server"
	@echo "- Run test scenarios"

test-generate-proto:
	@echo "TODO"
	@echo "- Clean proto-generated code"
	@echo "- Generate gRPC Web TypeScript client from test_scenarios.proto"
	@echo "- Generate Node TypeScript stubs from test_scenarios.proto"

init:
	npm ci

clean:
	rm -rf dist/
	rm -rf node_modules/
