// Copyright (c) 2020 WiseTime. All rights reserved.

import * as grpc from "@grpc/grpc-js"
import * as unaryScenariosPb from "../../generated/server/test_scenarios_grpc_pb"
import { IUnaryScenariosServer } from "../../generated/server/test_scenarios_grpc_pb"
import { EchoRequest, EchoResponse, Empty } from "../../generated/server/test_scenarios_pb"
import { Status } from "@grpc/grpc-js/build/src/constants"

class UnaryScenariosServerImpl implements IUnaryScenariosServer {

    ok = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<EchoResponse>): void => {
      console.log(`ok() called with payload: ${call.request?.getMessage()}`)
      callback(null, new EchoResponse().setMessage(call.request?.getMessage() + "-server"))
    }

    failedPrecondition = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
      console.log(`failedPrecondition() called with payload: ${call.request?.getMessage()}`)
      const error = { code: Status.FAILED_PRECONDITION, message: "Invalid request" }
      callback(error, new Empty())
    }

    noResponse = (call: grpc.ServerUnaryCall<EchoRequest, EchoResponse>, callback: grpc.sendUnaryData<Empty>): void => {
      console.log(`noResponse() called with payload: ${call.request?.getMessage()}`)
      callback(null, new Empty())
    }
}

const startServer = (): void => {
  const server = new grpc.Server()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(unaryScenariosPb["grpcwebrx.testing.UnaryScenarios"], new UnaryScenariosServerImpl())
  server.bindAsync("127.0.0.1:9090", grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      throw err
    }
    console.log(`Starting server, listening on: 127.0.0.1:${port}`)
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

