// Copyright (c) 2020 WiseTime. All rights reserved.

import Grpc from "grpc-web"
import { iif, Observable, of, Subscriber, throwError } from "rxjs"
import { catchError, delay, mergeMap, retryWhen } from "rxjs/operators"

type UnaryRpc<T> = () => Promise<T>
type ServerStreamingRpc = () => Grpc.ClientReadableStream<unknown>

/**
 * Configurable retry policy with support for specifying condition(s) to retry, maximum number of retries, and interval
 * between retries. This type is used with the {@link retryWithGrpc} pipe-able operator.
 *
 * @param shouldRetry - Determines whether the call should be retried or not
 * @param maxRetries  - Number of times to retry the request before giving up
 * @param beforeRetry - A retry will only be executed if this Promise is resolved with an exponential delay from the
 * provided min and max intervals.
 */
export type RetryPolicy = {
  shouldRetry: (error: Grpc.Error) => boolean,
  maxRetries: number,
  beforeRetry: (attempt: number) => Observable<void>,
}

const defaultMaxRetries = 2

/**
 * Convenience function for a retry policy that never retries calls.
 */
export const never: RetryPolicy = {
  shouldRetry: (_: Grpc.Error) => false,
  maxRetries: 0,
  beforeRetry: (_: number) => of(void 0),
}

/**
 * Convenience function for a retry policy that will retry calls when the server returns a non-OK status code (!= 200).
 * Note that calls that fail for other reasons (e.g. network failure) will not be retried.
 */
export const responseNotOk: RetryPolicy = {
  shouldRetry: (error: Grpc.Error) => error && error.code != Grpc.StatusCode.OK,
  maxRetries: defaultMaxRetries,
  beforeRetry: (_: number) => of(void 0),
}

/**
 * Convenience function for a retry policy that will retry calls with an exponential delay based on a provided initial
 * delay.
 */
export const retryAfter = (
  initialDelay: number,
): RetryPolicy => ({
  shouldRetry: (_: Grpc.Error) => true,
  maxRetries: defaultMaxRetries,
  beforeRetry: (attempt: number) => addExponentialDelay<void>(initialDelay)(of(void 0))(attempt),
} as const)

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
const isGrpcError = (error: unknown): error is Grpc.Error => {
  if (!error) {
    return false
  }

  const grpcWebError = error as Grpc.Error
  return "code" in grpcWebError && "message" in grpcWebError
}

/**
 * Computation for retry backoff based off of backoff-rxjs lib.
 *
 * @see {@link https://github.com/alex-okrushko/backoff-rxjs/blob/2e98471e445d338662a218c6aa065e1dd9a18d6c/src/utils.ts#L7|backoff-rxjs}
 */
const exponentialBackoff = (attempt: number, interval: number, maxInterval: number) => {
  const backoffInterval = Math.pow(2, attempt) * interval
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
 * Apply an exponential backoff retry policy / strategy to an Observable.
 *
 * @param initialDelay - Minimum interval between retries and is the basis of computation for further retries.
 * @param maxDelay - Maximum interval in between retries, capped at 60 minutes by default.
 */
export const addExponentialDelay = <T>(initialDelay: number, maxDelay?: number) => (observable: Observable<T>) => (attempt: number): Observable<T> => {
  return observable
    .pipe(
      delay(exponentialBackoff(attempt, initialDelay, maxDelay || 60_000)),
      catchError(e => throwError(e))
    )
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
export const retryWithGrpc = (retryPolicy: RetryPolicy) => <T>(source: Observable<T>): Observable<T> =>
  source.pipe(
    retryWhen((errors: Observable<unknown>) =>
      errors.pipe(
        mergeMap((error: unknown, attempt: number) => {
          if (!isGrpcError(error)) {
            return throwError(error)
          }
          return iif(
            () => attempt < retryPolicy.maxRetries && retryPolicy.shouldRetry(error),
            retryPolicy.beforeRetry(attempt)
              .pipe(
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
