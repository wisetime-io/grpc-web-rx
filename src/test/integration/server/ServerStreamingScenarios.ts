// Copyright (c) 2020 WiseTime. All rights reserved.

import { IServerStreamingScenariosServer } from "../../../generated/server/test_scenarios_grpc_pb"
import { EchoRequest, EchoResponse, Empty } from "../../../generated/server/test_scenarios_pb"
import { ServerWritableStream } from "@grpc/grpc-js"
import { Status } from "@grpc/grpc-js/build/src/constants"

export const ServerStreamingScenarios: IServerStreamingScenariosServer = {
  ok: (call: ServerWritableStream<EchoRequest, EchoResponse>): void => {
    for (let i = 1; i <= 5; i++) {
      call.write(new EchoResponse().setMessage(`${call.request?.getMessage()}-streaming-${i}`))
    }
    call.end()
  },
  failedPrecondition: (call: ServerWritableStream<EchoRequest, Empty>): void => {
    call.emit("error", { code: Status.FAILED_PRECONDITION, message: "Invalid request" })
  },
  noResponse: (call: ServerWritableStream<EchoRequest, Empty>): void => {
    for (let i = 1; i <= 2; i++) {
      call.write(new Empty())
    }
    call.end()
  },
}
