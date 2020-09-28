// Copyright (c) 2020 WiseTime. All rights reserved.

import { EchoRequest, EchoResponse, Empty } from "../../generated/client/test_scenarios_pb"
import {
  RetryScenariosClient,
  ServerStreamingScenariosClient,
  UnaryScenariosClient
} from "../../generated/client/Test_scenariosServiceClientPb"
import { RxGrpcClient } from "../../index"
import { StatusCode } from "grpc-web"

if (typeof window === "undefined") {
  console.log("Running from node...")
  global.XMLHttpRequest = require("xhr2")
} else {
  console.log("Running from browser...")
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const testNoOp = () => {
}

describe("test_scenarios.proto impl", () => {
  const request = new EchoRequest().setMessage("echo")
  const unaryRxClient = new RxGrpcClient(new UnaryScenariosClient("http://localhost:8080"))
  const serverStreamingRxClient = new RxGrpcClient(new ServerStreamingScenariosClient("http://localhost:8080"))

  it("should check that function signature exists in client", (done) => {
    const fakeRpc = RetryScenariosClient.prototype.authenticatedRpc

    try {
      unaryRxClient
        .call(fakeRpc)(new EchoRequest())
    } catch (e) {
      expect(e.getMessage()).toContain("unknown function signature")
    }
    done()
  })

  it("should append '-server' to request message on unary ok()", (done) => {
    unaryRxClient
      .customHeaders({ "custom-header": "custom-val", "x": "y" })
      .call<EchoRequest, EchoResponse>(UnaryScenariosClient.prototype.ok)(request)
      .subscribe(resp => {
        console.log(resp.getMessage())
        expect(resp.getMessage()).toBe(request.getMessage() + "-server")
        done()
      },
      _error => testNoOp())
  })

  it("should return grpc error on unary failedPrecondition()", (done) => {
    unaryRxClient
      .call<EchoRequest, Empty>(UnaryScenariosClient.prototype.failedPrecondition)(request)
      .subscribe(_resp => {
        testNoOp()
      },
      error => {
        expect(error.code).toBe(StatusCode.FAILED_PRECONDITION)
        done()
      })
  })

  it("should return 'empty' on unary noResponse()", (done) => {
    unaryRxClient
      .call<EchoRequest, Empty>(UnaryScenariosClient.prototype.noResponse)(request)
      .subscribe(next => {
        expect(next).toEqual(new Empty())
        done()
      },
      _error => testNoOp())
  })

  it("should append '-streaming' to request message on streaming ok()", (done) => {
    serverStreamingRxClient
      .call<EchoRequest, EchoResponse>(ServerStreamingScenariosClient.prototype.ok)(request)
      .subscribe(resp => {
        console.log(resp.getMessage())
        expect(resp.getMessage()).toContain(request.getMessage() + "-streaming")
        done()
      },
      _error => testNoOp())
  })

  it("should return grpc error on streaming failedPrecondition()", (done) => {
    serverStreamingRxClient
      .call<EchoRequest, EchoResponse>(ServerStreamingScenariosClient.prototype.failedPrecondition)(request)
      .subscribe(_resp => testNoOp(),
        error => {
          expect(error.code).toEqual(StatusCode.FAILED_PRECONDITION)
          done()
        })
  })
})
