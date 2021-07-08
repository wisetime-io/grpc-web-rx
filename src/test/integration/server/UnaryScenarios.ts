// Copyright (c) 2020 WiseTime. All rights reserved.

import { IUnaryScenariosServer } from "../../../generated/server/test_scenarios_grpc_pb"
import { EchoRequest, EchoResponse, Empty } from "../../../generated/server/test_scenarios_pb"
import * as grpc from "@grpc/grpc-js"
import { Status } from "@grpc/grpc-js/build/src/constants"

export class UnaryScenarios implements IUnaryScenariosServer {

  ok = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<EchoResponse>): void => {
    callback(null, new EchoResponse().setMessage(call.request?.getMessage() + "-server"))
  }

  failedPrecondition = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
    const error = { code: Status.FAILED_PRECONDITION, message: "Invalid request" }
    callback(error, null)
  }

  noResponse = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
    callback(null, new Empty())
  }
}
