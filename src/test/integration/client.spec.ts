// Copyright (c) 2020 WiseTime. All rights reserved.

import * as grpcWeb from "grpc-web"
import { EchoRequest, EchoResponse } from "../../generated/client/test_scenarios_pb"
import {
  UnaryScenariosClient
} from "../../generated/client/Test_scenariosServiceClientPb"

if (typeof window === "undefined") {
  console.log("Running from node...")
  global.XMLHttpRequest = require("xhr2")
} else {
  console.log("Running from browser...")
}

describe("UnaryScenarios service", () => {
  const unaryScenariosClient = new UnaryScenariosClient("http://localhost:8080")

  it("appends '-server' to request message on unary ok()", (done) => {
    const request = new EchoRequest().setMessage("echo")
    unaryScenariosClient.ok(request, {}, (err: grpcWeb.Error, response: EchoResponse) => {
      expect(response.getMessage()).toBe(request.getMessage() + "-server")
      done()
    })
  })
})
