import { EchoRequest, EchoResponse } from "../../../generated/client/test_scenarios_pb"
import { ServerStreamingScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { setupIntegrationTests, testNoOp } from "./testUtil"
import { StatusCode } from "grpc-web"
import { fromServerStreamingRpc } from "../../../index"
import { Empty } from "../../../generated/server/test_scenarios_pb"

setupIntegrationTests()

describe("server streaming rpc scenarios", () => {
  const request = new EchoRequest().setMessage("echo")
  const serverStreamingClient = new ServerStreamingScenariosClient("http://localhost:8080")

  it("should append '-streaming' to request message on streaming ok()", (done) => {
    fromServerStreamingRpc(serverStreamingClient.ok(request, {}))
      .subscribe(resp => {
        expect((resp as EchoResponse).getMessage()).toContain(request.getMessage() + "-streaming")
        done()
      },
      _error => testNoOp())
  })

  it("should return grpc error on streaming failedPrecondition()", (done) => {
    fromServerStreamingRpc(serverStreamingClient.failedPrecondition(request, {}))
      .subscribe(_resp => testNoOp(),
        error => {
          expect(error.code).toEqual(StatusCode.FAILED_PRECONDITION)
          done()
        })
  })

  it("should return Empty on request to streaming noResponse()", (done) => {
    fromServerStreamingRpc(serverStreamingClient.noResponse(request, {}))
      .subscribe(resp => {
        expect(resp).toEqual(new Empty())
        done()
      },
      _error => testNoOp())
  })
})
