// Copyright (c) 2020 WiseTime. All rights reserved.

/**
 * Add support for running grpc-web integration tests in a node server environment.
 */
export const setupIntegrationTests = (): void => {
  if (typeof window === "undefined") {
    console.log("Running from node...")
    global.XMLHttpRequest = require("xhr2")
  } else {
    console.log("Running from browser...")
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const testNoOp = (): void => {}
