// Copyright (c) 2020 WiseTime. All rights reserved.

import { setupIntegrationTests, testNoOp } from "./testUtil"
import { FailThenSucceedRequest, FailThenSucceedResponse } from "../../../generated/client/test_scenarios_pb"
import { RetryScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { from, RetryPolicy, retry } from "../../../index"
import * as Grpc from "grpc-web"
import fakerStatic from "faker"

setupIntegrationTests()

describe("retry scenarios impl", () => {
  const retryClient = new RetryScenariosClient("http://localhost:8081")
  const timeout = 10_000

  const generateRetryRequest = (numFailuresUntilSuccess: number) => {
    return new FailThenSucceedRequest()
      .setKey(fakerStatic.random.uuid())
      .setNumFailures(numFailuresUntilSuccess)
  }

  const expectRpcRetryFailure = (request: FailThenSucceedRequest, retryPolicy: RetryPolicy, done: jest.DoneCallback) => {
    from(() => retryClient.failThenSucceed(request, {}))
      .pipe(retry(retryPolicy))
      .subscribe({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: _value => testNoOp(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: _err => done(),
        complete: () => testNoOp()
      })
  }

  it("should retry until success", (done) => {
    const numFailuresUntilSuccess = 2
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const retryPolicy = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry: () => Promise.resolve(),
      interval: 500
    }

    from(() => retryClient.failThenSucceed(request, {}))
      .pipe(retry(retryPolicy))
      .subscribe({
        next: value => {
          expect(value.getNumFailures()).toEqual(numFailuresUntilSuccess)
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: _err => testNoOp(),
        complete: () => testNoOp()
      })
  }, timeout)

  it("should retry streaming rpc until success and complete", (done) => {
    const numFailuresUntilSuccess = 2
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const retryPolicy = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry: () => Promise.resolve(),
      interval: 500
    }

    from<FailThenSucceedResponse>(() => retryClient.failThenSucceedStream(request, {}))
      .pipe(retry(retryPolicy))
      .subscribe({
        next: value => {
          expect(value.getNumFailures()).toEqual(numFailuresUntilSuccess)
          done()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: _err => console.log(_err),
        complete: () => done()
      })
  }, timeout)

  it("should fail when exceeding max retry attempts", (done) => {
    const numFailuresUntilSuccess = 5
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const retryPolicyExceedingMaxRetries = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: numFailuresUntilSuccess - 1,
      beforeRetry: () => Promise.resolve(),
      interval: 500
    }

    expectRpcRetryFailure(request, retryPolicyExceedingMaxRetries, done)
  }, timeout)

  it("should fail when beforeRetry() promise is rejected", (done) => {
    const numFailuresUntilSuccess = 2
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const retryPolicyWithRejectedPromise = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry: () => Promise.reject("error"),
      interval: 500
    }

    expectRpcRetryFailure(request, retryPolicyWithRejectedPromise, done)
  }, timeout)
})
