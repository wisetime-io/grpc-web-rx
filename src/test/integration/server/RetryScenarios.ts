// Copyright (c) 2020 WiseTime. All rights reserved.

import { IRetryScenariosServer } from "../../../generated/server/test_scenarios_grpc_pb"
import { sendUnaryData, ServerUnaryCall, ServerWritableStream } from "@grpc/grpc-js"
import {
  EchoRequest,
  EchoResponse,
  FailThenSucceedRequest,
  FailThenSucceedResponse
} from "../../../generated/server/test_scenarios_pb"
import { Status } from "@grpc/grpc-js/build/src/constants"

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U } ? U : never;

type KnownOnly<T extends Record<any,any>> = Pick<T, KnownKeys<T>>

// Partial implementation from
// https://github.com/agreatfool/grpc_tools_node_protoc_ts/blob/master/doc/server_impl_signature.md#class-style
// tests are failing with TypedServerOverride
export type ITypedRetryScenariosServer = KnownOnly<IRetryScenariosServer>

export class RetryScenarios implements ITypedRetryScenariosServer {
  failuresMap: Map<string, number> = new Map<string, number>()

  getNumFailuresAndCurrent = (call: ServerUnaryCall<FailThenSucceedRequest, FailThenSucceedResponse>): { numFailures: number, current: number } => {
    const key = call.request?.getKey() || "key"
    const numFailures = call.request?.getNumFailures() || 1

    const current = this.failuresMap.get(key) || 1
    this.failuresMap.set(key, current + 1)
    return { numFailures, current }
  }

  authenticatedRpc = (call: ServerUnaryCall<EchoRequest, EchoResponse>, callback: sendUnaryData<EchoResponse>): void => {
    callback(null, new EchoResponse())
  }

  failThenSucceed = (call: ServerUnaryCall<FailThenSucceedRequest, FailThenSucceedResponse>, callback: sendUnaryData<FailThenSucceedResponse>): void => {
    const { numFailures, current } = this.getNumFailuresAndCurrent(call)

    if (current > numFailures) {
      callback(null, new FailThenSucceedResponse().setNumFailures(numFailures))
    } else {
      const error = { code: Status.PERMISSION_DENIED, message: "Unauthorized" }
      callback(error, null)
    }
  }

  failThenSucceedStream = (call: ServerWritableStream<FailThenSucceedRequest, FailThenSucceedResponse>): void => {
    const { numFailures, current } = this.getNumFailuresAndCurrent(call)

    if (current > numFailures) {
      for (let i = 0; i <= numFailures; i++) {
        call.write(new FailThenSucceedResponse().setNumFailures(numFailures))
      }
      call.end()
    } else {
      const error = { code: Status.PERMISSION_DENIED, message: "Unauthorized" }
      call.emit("error", error)
    }
  }
}
