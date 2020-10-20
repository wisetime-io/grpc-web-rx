// Copyright (c) 2020 WiseTime. All rights reserved.

import Grpc from "grpc-web"
import { from, iif, Observable, Subscriber, throwError } from "rxjs"
import { catchError, delay, mergeMap, retryWhen } from "rxjs/operators"

type UnaryRpc<T> = () => Promise<T>
type ServerStreamingRpc = () => Grpc.ClientReadableStream<unknown>

/**
 * Configurable retry policy with support for specifying condition(s) to retry, maximum number of retries, and interval
 * between retries. This type is used with the {@link retryWithGrpc} pipe-able operator.
 *
 * @param shouldRetry - Determines whether the call should be retried or not
 * @param maxRetries  - Number of times to retry the request before giving up
 * @param beforeRetry - A retry will only be executed if this Promise is resolved
 * @param interval  - Duration between retries (ms since Unix epoch)
 */
export type RetryPolicy = {
  shouldRetry: (error: Grpc.Error) => boolean,
  maxRetries: number,
  beforeRetry: () => Promise<void>,
  interval: number,
}

/**
 * Custom type guard that determines whether 'response' comes from a server-streaming rpc.
 *
 * @param response - Return type of either unary or server-streaming call
 */
const isServerStreaming = <T>(response: ReturnType<UnaryRpc<T>> | ReturnType<ServerStreamingRpc>): response is ReturnType<ServerStreamingRpc> => "on" in response

/**
 * Custom type guard that determines whether 'error' is a {@link Grpc.Error}.
 *
 * @param error - Generic error whose type is unknown
 */
const isGrpcWebError = (error: unknown): error is Grpc.Error => {
  if (!error) {
    return false
  }

  const grpcWebError = error as Grpc.Error
  return "code" in grpcWebError && "message" in grpcWebError
}

/**
 * Computation for retry backoff based off of backoff-rxjs lib, maximum interval is capped at 60 minutes.
 *
 * @see {@link https://github.com/alex-okrushko/backoff-rxjs/blob/2e98471e445d338662a218c6aa065e1dd9a18d6c/src/utils.ts#L7|backoff-rxjs}
 */
const exponentialBackoff = (attempt: number, interval: number) => {
  const backoffInterval = Math.pow(2, attempt) * interval
  const maxInterval = 1000 * 60 * 60
  return Math.min(backoffInterval, maxInterval)
}

const fromServerStreaming = <T>(call: Grpc.ClientReadableStream<unknown>, observer: Subscriber<T>): void => {
  call.on("data", data => {
    return data !== undefined ? observer.next(data as T)
      : observer.error(new Error("Response type must be defined"))
  })
  call.on("error", error => observer.error(error))
  call.on("status", status => {
    if (status.code == Grpc.StatusCode.OK) {
      return observer.complete()
    }
  })
}

const fromUnary = <T>(call: Promise<T>, observer: Subscriber<T>): Promise<void> =>
  call
    .then(value => {
      observer.next(value)
      observer.complete()
    })
    .catch((err: unknown) => observer.error(err))

/**
 * Wraps a gRPC-web call and returns an {@link Observable}.
 *
 * Note: {@link gRPC-web|https://github.com/grpc/grpc-web} only supports unary and server-streaming clients for now.
 *
 * @param rpc - gRPC-web call which can either be unary or server-streaming
 */
export const fromGrpc = <T>(rpc: UnaryRpc<T> | ServerStreamingRpc): Observable<T> =>
  new Observable<T>(observer => {
    const call = rpc()

    if (isServerStreaming<T>(call)) {
      fromServerStreaming(call, observer)
    } else {
      fromUnary(call, observer)
    }
  })

/**
 * Wrapper around rxjs {@link retryWhen} operator with custom retry policy support.
 *
 * - If the error does not match the retry policy's shouldRetry condition then the error is rethrown
 * - If the error is retryable and exceeds the maximum retry attempts then the error is rethrown
 * - If the provided beforeRetry() promise is rejected then the error is rethrown
 * - Otherwise the call from the source observable is retried with an exponential backoff
 *
 * @param retryPolicy - Custom retry policy
 */
export const retryWithGrpc = (retryPolicy: RetryPolicy) => <T>(source: Observable<T>): Observable<T> =>
  source.pipe(
    retryWhen((errors: Observable<unknown>) =>
      errors.pipe(
        mergeMap((error: unknown, attempt: number) => {
          if (!isGrpcWebError(error)) {
            return throwError(error)
          }
          return iif(
            () => attempt < retryPolicy.maxRetries && retryPolicy.shouldRetry(error),
            from(retryPolicy.beforeRetry())
              .pipe(
                delay(exponentialBackoff(attempt, retryPolicy.interval)),
                /*
                 * If the rejected promise's error is undefined, then propagate the source observable's error.
                 */
                catchError(e => e ? throwError(e) : throwError(error))
              ),
            throwError(error)
          )
        }),
      ),
    )
  )
