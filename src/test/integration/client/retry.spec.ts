// Copyright (c) 2020 WiseTime. All rights reserved.

import { rpcWithMultipleErrors, setupIntegrationTests, testNoOp } from "./testUtil"
import { FailThenSucceedRequest, FailThenSucceedResponse } from "../../../generated/client/test_scenarios_pb"
import { RetryScenariosClient } from "../../../generated/client/Test_scenariosServiceClientPb"
import { from, RetryPolicy, retry } from "../../../index"
import * as Grpc from "grpc-web"
import fakerStatic from "faker"
import { iif, of } from "rxjs"
import { withExponentialDelay } from "../../../retry"
import { fromPromise } from "rxjs/internal-compatibility"

setupIntegrationTests()

describe("retry scenarios impl", () => {
  const host = process.env.ENVOY_HOST || "localhost"
  const retryClient = new RetryScenariosClient(`http://${host}:8081`)
  const timeout = 20_000

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
    const withDelay = withExponentialDelay<void>(500, 60_000)
    const beforeRetry = withDelay(_ => of(undefined))
    const retryPolicy = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry
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
    const numFailuresUntilSuccess = 5
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const withDelay = withExponentialDelay<void>(100, 1_000)
    const beforeRetry = withDelay(_ => of(undefined))
    const retryPolicy = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 15,
      beforeRetry
    }

    let requestsCount = 0
    rpcWithMultipleErrors<FailThenSucceedResponse>(() => {
      requestsCount++
      return retryClient.failThenSucceedStream(request, {})
    })
      .pipe(retry(retryPolicy))
      .subscribe({
        next: value => {
          expect(value.getNumFailures()).toEqual(numFailuresUntilSuccess)
        },
        error: err => console.log(err),
        complete: () => {
          expect(requestsCount).toEqual(numFailuresUntilSuccess + 1)
          done()
        }
      })
  }, timeout)

  it("should fail when exceeding max retry attempts", (done) => {
    const numFailuresUntilSuccess = 5
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const withDelay = withExponentialDelay<void>(500, 60_000)
    const beforeRetry = withDelay(_ => of(undefined))
    const retryPolicyExceedingMaxRetries = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: numFailuresUntilSuccess - 1,
      beforeRetry
    }

    expectRpcRetryFailure(request, retryPolicyExceedingMaxRetries, done)
  }, timeout)

  it("should fail when beforeRetry() promise is rejected", (done) => {
    const numFailuresUntilSuccess = 2
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const withDelay = withExponentialDelay<void>(500, 60_000)
    const beforeRetry = withDelay(_ => fromPromise(Promise.reject()))
    const retryPolicyWithRejectedPromise = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry
    }

    expectRpcRetryFailure(request, retryPolicyWithRejectedPromise, done)
  }, timeout)

  it("should have access to exception in beforeRetry()", (done) => {
    const numFailuresUntilSuccess = 2
    const request = generateRetryRequest(numFailuresUntilSuccess)
    const withDelay = withExponentialDelay<void>(500, 60_000)
    const beforeRetry = withDelay(
      (error) => iif(() =>  error.code == Grpc.StatusCode.PERMISSION_DENIED, fromPromise(Promise.reject()))
    )
    const retryPolicy = {
      shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
      maxRetries: 2,
      beforeRetry
    }

    expectRpcRetryFailure(request, retryPolicy, done)
  }, timeout)
})
