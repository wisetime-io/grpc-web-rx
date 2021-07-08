// Copyright (c) 2020 WiseTime. All rights reserved.

import * as grpc from "@grpc/grpc-js"
import { UnaryScenarios } from "./UnaryScenarios"
import { ServerStreamingScenarios } from "./ServerStreamingScenarios"
import { RetryScenarios } from "./RetryScenarios"
import { UnaryScenariosService, ServerStreamingScenariosService, RetryScenariosService } from "../../../generated/server/test_scenarios_grpc_pb"

const startServer = (): void => {
  const server = new grpc.Server()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(UnaryScenariosService, new UnaryScenarios())
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(ServerStreamingScenariosService, new ServerStreamingScenarios())
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(RetryScenariosService, new RetryScenarios())

  server.bindAsync("0.0.0.0:9090", grpc.ServerCredentials.createInsecure(), (err, port) => {
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
