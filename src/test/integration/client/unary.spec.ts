// Copyright (c) 2020 WiseTime. All rights reserved.

import { EchoRequest, Empty } from "../../../generated/client/test_scenarios_pb"
import { UnaryScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { setupIntegrationTests, testNoOp } from "./testUtil"
import { StatusCode } from "grpc-web"
import { from } from "../../../index"

setupIntegrationTests()

describe("unary rpc scenarios", () => {
  const request = new EchoRequest().setMessage("echo")
  const host = process.env.ENVOY_HOST || "localhost"
  const unaryScenariosClient = new UnaryScenariosClient(`http://${host}:8081`)

  it("should append '-server' to request message on unary ok()", (done) => {
    from(() => unaryScenariosClient.ok(request, {}))
      .subscribe({
        next: resp => {
          expect(resp.getMessage()).toBe(request.getMessage() + "-server")
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: _ => testNoOp()
      })
  })

  it("should return grpc error on unary failedPrecondition()", (done) => {
    from(() => unaryScenariosClient.failedPrecondition(request, {}))
      .subscribe({
        next: _ => testNoOp(),
        error: err => {
          expect(err.code).toEqual(StatusCode.FAILED_PRECONDITION)
          done()
        }
      })
  })

  it("should receive trailing metadata", (done) => {
    from(() => unaryScenariosClient.failedPrecondition(request, {}))
      .subscribe({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: _ => testNoOp(),
        error: err => {
          expect(err.metadata?.key).toEqual("value")
          done()
        }
      })
  })

  it("should return 'empty' on unary noResponse()", (done) => {
    from(() => unaryScenariosClient.noResponse(request, {}))
      .subscribe({
        next: resp => {
          expect(resp).toEqual(new Empty())
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: _ => testNoOp()
      })
  })
})
