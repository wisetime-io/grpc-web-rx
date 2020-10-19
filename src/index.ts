// Copyright (c) 2020 WiseTime. All rights reserved.

import { from, iif, Observable, throwError } from "rxjs"
import * as grpcWeb from "grpc-web"
import { catchError, delay, mergeMap, retryWhen } from "rxjs/operators"

type UnaryRpc<T> = () => Promise<T>
type ServerStreamingRpc = () => grpcWeb.ClientReadableStream<unknown>

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
      call.on("data", data => {
        return data !== undefined ? observer.next(data as T)
          : observer.error(new Error("Response type must be defined"))
      })
      call.on("error", error => observer.error(error))
      call.on("status", status => {
        if (status.code == grpcWeb.StatusCode.OK) {
          return observer.complete()
        }
      })
    } else {
      call
        .then(value => {
          observer.next(value)
          observer.complete()
        })
        .catch((err: unknown) => observer.error(err))
    }
  })

/**
 * Custom type guard that determines whether 'response' comes from a server-streaming rpc.
 *
 * @param response - Return type of either unary or server-streaming call
 */
const isServerStreaming = <T>(response: ReturnType<UnaryRpc<T>> | ReturnType<ServerStreamingRpc>): response is ReturnType<ServerStreamingRpc> => "on" in response

/**
 * Configurable retry policy with support for specifying condition(s) to retry, maximum number of retries, and interval
 * between retries. This type is used with the {@link retryWithGrpc} pipe-able operator.
 *
 * @param shouldRetry - Determines whether the call should be retried or not
 * @param maxRetries  - Number of times to retry the request before giving up
 * @param beforeRetry - A retry will only be executed if this Promise is resolved
 * @param intervalMs  - Duration between retries
 */
export type RetryPolicyGrpc = {
  shouldRetry: (error: grpcWeb.Error) => boolean,
  maxRetries: number,
  beforeRetry: () => Promise<void>,
  intervalMs: number,
}

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
export const retryWithGrpc = (retryPolicy: RetryPolicyGrpc) => <T>(source: Observable<T>): Observable<T> =>
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
                delay(exponentialBackoff(attempt, retryPolicy.intervalMs)),
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

/**
 * Custom type guard that determines whether 'error' is a {@link grpcWeb.Error}.
 *
 * @param error - Generic error whose type is unknown
 */
const isGrpcWebError = (error: unknown): error is grpcWeb.Error => {
  if (!error) {
    return false
  }

  const grpcWebError = error as grpcWeb.Error
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
