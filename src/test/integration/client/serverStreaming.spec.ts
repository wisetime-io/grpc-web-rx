// Copyright (c) 2020 WiseTime. All rights reserved.

import { EchoRequest, EchoResponse } from "../../../generated/client/test_scenarios_pb"
import { ServerStreamingScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { setupIntegrationTests, testNoOp } from "./testUtil"
import { StatusCode } from "grpc-web"
import { fromGrpc } from "../../../index"
import { Empty } from "../../../generated/server/test_scenarios_pb"

setupIntegrationTests()

describe("server streaming rpc scenarios", () => {
  const request = new EchoRequest().setMessage("echo")
  const serverStreamingClient = new ServerStreamingScenariosClient("http://localhost:8080")

  it("should append '-streaming' to request message on streaming ok()", (done) => {
    fromGrpc(() => serverStreamingClient.ok(request, {}))
      .subscribe(
        resp => {
          expect((resp as EchoResponse).getMessage()).toContain(request.getMessage() + "-streaming")
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _error => testNoOp())
  })

  it("should return grpc error on streaming failedPrecondition()", (done) => {
    fromGrpc(() => serverStreamingClient.failedPrecondition(request, {}))
      // .pipe(retryWithGrpc(retryPolicyWithRejectedPromise))
      .subscribe(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _resp => testNoOp(),
        error => {
          expect(error.code).toEqual(StatusCode.FAILED_PRECONDITION)
          done()
        })
  })

  it("should return Empty on request to streaming noResponse()", (done) => {
    fromGrpc(() => serverStreamingClient.noResponse(request, {}))
      .subscribe(resp => {
          expect(resp).toEqual(new Empty())
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _error => testNoOp())
  })
})
