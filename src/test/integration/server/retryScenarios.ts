// Copyright (c) 2020 WiseTime. All rights reserved.

import { IRetryScenariosServer } from "../../../generated/server/test_scenarios_grpc_pb"
import { sendUnaryData, ServerUnaryCall } from "@grpc/grpc-js"
import {
  EchoRequest,
  EchoResponse,
  FailThenSucceedRequest,
  FailThenSucceedResponse
} from "../../../generated/server/test_scenarios_pb"
import { StatusCode } from "grpc-web"

export class RetryScenarios implements IRetryScenariosServer {

  failuresMap: Map<string, number> = new Map<string, number>()

  authenticatedRpc(call: ServerUnaryCall<EchoRequest, EchoResponse>, callback: sendUnaryData<EchoResponse>): void {
    callback(null, new EchoResponse())
  }

  failThenSucceed(call: ServerUnaryCall<FailThenSucceedRequest, FailThenSucceedResponse>, callback: sendUnaryData<FailThenSucceedResponse>): void {
    const key = call.request?.getKey() || "key"
    const numFailures = call.request?.getNumFailures() || 1

    const current = this.failuresMap.get(key) || 1
    this.failuresMap.set(key, current + 1)

    console.log(`request: ${key} with attempt #${current}`)

    if (current > numFailures) {
      callback(null, new FailThenSucceedResponse().setNumFailures(numFailures))
    } else {
      const error = { code: StatusCode.PERMISSION_DENIED, message: "Unauthorized" }
      callback(error, null)
    }
  }
}
