// Copyright (c) 2020 WiseTime. All rights reserved.

import { EchoRequest, Empty } from "../../../generated/client/test_scenarios_pb"
import { UnaryScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { setupIntegrationTests, testNoOp } from "./testUtil"
import { StatusCode } from "grpc-web"
import { from } from "../../../index"

setupIntegrationTests()

describe("unary rpc scenarios", () => {
  const request = new EchoRequest().setMessage("echo")
  const unaryScenariosClient = new UnaryScenariosClient("http://localhost:8081")

  it("should append '-server' to request message on unary ok()", (done) => {
    from(() => unaryScenariosClient.ok(request, {}))
      .subscribe(resp => {
        expect(resp.getMessage()).toBe(request.getMessage() + "-server")
        done()
      },
      _error => testNoOp())
  })

  it("should return grpc error on unary failedPrecondition()", (done) => {
    from(() => unaryScenariosClient.failedPrecondition(request, {}))
      .subscribe(_next => testNoOp(),
        error => {
          expect(error.code).toEqual(StatusCode.FAILED_PRECONDITION)
          done()
        })
  })

  it("should return 'empty' on unary noResponse()", (done) => {
    from(() => unaryScenariosClient.noResponse(request, {}))
      .subscribe(next => {
        expect(next).toEqual(new Empty())
        done()
      },
      _error => testNoOp())
  })
})
