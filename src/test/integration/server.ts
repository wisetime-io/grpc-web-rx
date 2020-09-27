// Copyright (c) 2020 WiseTime. All rights reserved.

import * as grpc from "@grpc/grpc-js"
import { ServerWritableStream } from "@grpc/grpc-js"
import * as scenariosPb from "../../generated/server/test_scenarios_grpc_pb"
import { IServerStreamingScenariosServer, IUnaryScenariosServer } from "../../generated/server/test_scenarios_grpc_pb"
import { EchoRequest, EchoResponse, Empty } from "../../generated/server/test_scenarios_pb"
import { Status } from "@grpc/grpc-js/build/src/constants"

class UnaryScenariosServerImpl implements IUnaryScenariosServer {

  ok = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<EchoResponse>): void => {
    console.log(`unary ok() called with payload: ${call.request?.getMessage()}`)
    callback(null, new EchoResponse().setMessage(call.request?.getMessage() + "-server"))
  }

  failedPrecondition = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
    console.log(`unary failedPrecondition() called with payload: ${call.request?.getMessage()}`)
    const error = { code: Status.FAILED_PRECONDITION, message: "Invalid request" }
    callback(error, new Empty())
  }

  noResponse = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
    console.log(`unary noResponse() called with payload: ${call.request?.getMessage()}`)
    callback(null, new Empty())
  }
}

class ServerStreamingScenariosServerImpl implements IServerStreamingScenariosServer {

  failedPrecondition = (call: ServerWritableStream<EchoRequest, Empty>): void => {
    console.log(`server-streaming failedPrecondition() called with payload: ${call.request?.getMessage()}`)
    call.emit("error", { code: Status.FAILED_PRECONDITION, message: "Invalid request" })
    call.end()
  }

  noResponse = (call: ServerWritableStream<EchoRequest, Empty>): void => {
    console.log(`server-streaming noResponse() called with payload: ${call.request?.getMessage()}`)
    for (let i = 1; i <= 5; i++) {
      call.write(new EchoResponse().setMessage(`${call.request?.getMessage()}-streaming-${i}`))
    }
    call.end()
  }

  ok = (call: ServerWritableStream<EchoRequest, EchoResponse>): void => {
    console.log(`server-streaming ok() called with payload: ${call.request?.getMessage()}`)
    for (let i = 1; i <= 5; i++) {
      call.write(new EchoResponse().setMessage(`${call.request?.getMessage()}-streaming-${i}`))
    }
    call.end()
  }
}

const startServer = (): void => {
  const server = new grpc.Server()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(scenariosPb["grpcwebrx.testing.UnaryScenarios"], new UnaryScenariosServerImpl())
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(scenariosPb["grpcwebrx.testing.ServerStreamingScenarios"], new ServerStreamingScenariosServerImpl())
  server.bindAsync("127.0.0.1:9090", grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      throw err
    }
    console.log(`Starting gRPC server, listening on: 127.0.0.1:${port}`)
    server.start()
  })
}

startServer()

process.on("uncaughtException", (err) => {
  console.log(`process on uncaughtException error: ${err}`)
})

process.on("unhandledRejection", (err) => {
  console.log(`process on unhandledRejection error: ${err}`)
})

