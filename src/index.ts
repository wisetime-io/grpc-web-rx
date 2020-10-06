// Copyright (c) 2020 WiseTime. All rights reserved.

import { from, iif, Observable, throwError } from "rxjs"
import * as grpcWeb from "grpc-web"
import { catchError, delay, mergeMap, retryWhen } from "rxjs/operators"

type UnaryRpc<Resp> = () => Promise<Resp>
type ServerStreamingRpc<Resp> = () => grpcWeb.ClientReadableStream<Resp>

/**
 * Wraps a gRPC-web call and returns an {@link Observable}.
 * Note: {@link grpc-web|https://github.com/grpc/grpc-web only supports unary and server-streaming clients for now.
 *
 * @param rpc - grpc-web call which can either be unary or server-streaming
 */
export const fromGrpc = <Resp>(rpc: UnaryRpc<Resp> | ServerStreamingRpc<Resp>): Observable<Resp> => {
  return new Observable<Resp>(observer => {
    const call = rpc()
    if ("on" in call) {
      call.on("data", (data: Resp) => observer.next(data))
      call.on("error", (error: grpcWeb.Error) => observer.error(error))
      call.on("end", () => observer.complete())
    } else {
      call
        .then(value => {
          observer.next(value)
          observer.complete()
        })
        .catch(err => observer.error(err))
    }
  })
}

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
 * Computation for retry backoff based off of backoff-rxjs lib, maximum interval is capped at 60 minutes.
 *
 * @see {@link https://github.com/alex-okrushko/backoff-rxjs/blob/2e98471e445d338662a218c6aa065e1dd9a18d6c/src/utils.ts#L7|backoff-rxjs}
 */
const exponentialBackoff = (attempt: number, interval: number) => {
  const backoffInterval = Math.pow(2, attempt) * interval
  const maxInterval = 1000 * 60 * 60
  return Math.min(backoffInterval, maxInterval)
}

/**
 * Wrapper around rxjs' {@link retryWhen} operator with custom retry policy support.
 *
 * - If the error does not match the retry policy's shouldRetry condition then the error is rethrown.
 * - If the error is retryable and exceeds the maximum retry attempts then the error is rethrown.
 * - If the provided beforeRetry() promise is rejected then the error is rethrown.
 * - Otherwise the call from the source observable is retried with an exponential backoff
 *
 * @param retryPolicy - Custom retry policy
 */
export const retryWithGrpc = (retryPolicy: RetryPolicyGrpc) => <T>(source: Observable<T>): Observable<T> => {
  return source.pipe(
    retryWhen<T>((errors: Observable<grpcWeb.Error>) =>
      errors.pipe(
        mergeMap((err, attempt) => {
          return iif(
            () => attempt < retryPolicy.maxRetries && retryPolicy.shouldRetry(err),
            from(retryPolicy.beforeRetry())
              .pipe(
                delay(exponentialBackoff(attempt, retryPolicy.intervalMs)),
                /*
                 * If the rejected promise's error is undefined, then propagate the source observable's error.
                 */
                catchError(e => e ? throwError(e) : throwError(err))
              ),
            throwError(err)
          )
        }),
      ),
    )
  )
}


