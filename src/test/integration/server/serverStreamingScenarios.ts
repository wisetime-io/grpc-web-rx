// Copyright (c) 2020 WiseTime. All rights reserved.

import { IServerStreamingScenariosServer } from "../../../generated/server/test_scenarios_grpc_pb"
import { ServerWritableStream } from "@grpc/grpc-js"
import { EchoRequest, EchoResponse, Empty } from "../../../generated/server/test_scenarios_pb"
import { Status } from "@grpc/grpc-js/build/src/constants"

export class ServerStreamingScenarios implements IServerStreamingScenariosServer {

  ok = (call: ServerWritableStream<EchoRequest, EchoResponse>): void => {
    console.log(`server-streaming ok() called with payload: ${call.request?.getMessage()}`)
    for (let i = 1; i <= 5; i++) {
      call.write(new EchoResponse().setMessage(`${call.request?.getMessage()}-streaming-${i}`))
    }
    call.end()
  }

  failedPrecondition = (call: ServerWritableStream<EchoRequest, Empty>): void => {
    console.log(`server-streaming failedPrecondition() called with payload: ${call.request?.getMessage()}`)
    for (let i = 1; i <= 5; i++) {
      call.emit("error", { code: Status.FAILED_PRECONDITION, message: "Invalid request" })
    }
  }

  noResponse = (call: ServerWritableStream<EchoRequest, Empty>): void => {
    console.log(`server-streaming noResponse() called with payload: ${call.request?.getMessage()}`)
    for (let i = 1; i <= 2; i++) {
      call.write(new Empty())
    }
    call.end()
  }
}
