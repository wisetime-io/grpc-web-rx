# Test Server

This module contains the server implementation, and the local proxy (envoy) config for our end-to-end test scenarios.

To set up your local environment for running end-to-end tests:

1. Start the server with `ts-node src/test/integration/server.ts` in terminal window
2. Start the local envoy proxy by running `sh scripts/start-envoy-local.sh`

Tests in `unary.spec.ts` can now be executed against said local node server.

Alternatively, you can perform set up and run all the tests by running `make integration`.
