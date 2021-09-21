// Copyright (c) 2020 WiseTime. All rights reserved.

import { ServerStreamingRpc } from "../../../client"
import { Observable } from "rxjs"
import * as Grpc from "grpc-web"

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

/**
 * Wrap an rpc call with observable that sends multiple errors on single rpc error for multi error simulation
 */
export const rpcWithMultipleErrors = <T>(rpc: ServerStreamingRpc): Observable<T> => (
  new Observable<T>(observer => {
    const call = rpc()
    call.on("data", data =>
      data !== undefined
        ? observer.next(data as T)
        : observer.error(new Error("Response payload is undefined"))
    )
    call.on("error", error => {
      // simulate server/proxy to send multiple errors
      observer.error(error)
      observer.error(error)
      observer.error(error)
    })
    call.on("status", status => {
      if (status.code == Grpc.StatusCode.OK) {
        observer.complete()
      }
    })
  })
)

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const testNoOp = (): void => {}
