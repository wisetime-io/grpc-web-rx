// Copyright (c) 2020 WiseTime. All rights reserved.

import * as grpc from "@grpc/grpc-js"
import * as scenariosPb from "../../../generated/server/test_scenarios_grpc_pb"
import { UnaryScenarios } from "./unaryStreamingScenarios"
import { ServerStreamingScenarios } from "./serverStreamingScenarios"

const startServer = (): void => {
  const server = new grpc.Server()

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(scenariosPb["grpcwebrx.testing.UnaryScenarios"], new UnaryScenarios())
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  server.addService(scenariosPb["grpcwebrx.testing.ServerStreamingScenarios"], new ServerStreamingScenarios())

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
