// Copyright (c) 2020 WiseTime. All rights reserved.

import Grpc from "grpc-web"
import { iif, Observable, of, throwError } from "rxjs"
import { catchError, delay, mergeMap, retryWhen } from "rxjs/operators"

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

/**
 * Calculate delay value for exponential backoff strategy.
 * Based on the backoff-rxjs lib.
 * @see {@link https://github.com/alex-okrushko/backoff-rxjs/blob/2e98471e445d338662a218c6aa065e1dd9a18d6c/src/utils.ts#L7|backoff-rxjs}
 */
const exponentialBackoff = (attempt: number, interval: number, maxInterval: number) => {
  const backoffInterval = Math.pow(2, attempt) * interval
  return Math.min(backoffInterval, maxInterval)
}

/**
 * Apply a delay to an Observable, that increases exponentially with the number of retry attempts.
 *
 * @param initialDelay - Initial delay that is applied on first retry.
 * @param maxDelay - Maximum delay to apply. Defaults to 1 hour.
 */
export const addExponentialDelay =
  <T>(initialDelay: number, maxDelay?: number) => (observable: Observable<T>) => (attempt: number): Observable<T> =>
    observable
      .pipe(
        delay(exponentialBackoff(attempt, initialDelay, maxDelay || 60_000)),
        catchError(e => throwError(e))
      )

/**
 * A retry policy that never retries calls.
 */
export const never: RetryPolicy = {
  shouldRetry: (_: Grpc.Error) => false,
  maxRetries: 0,
  beforeRetry: (_: number) => of(undefined),
}

/**
 * Configure a retry policy that will retry calls when the server returns a non-OK gRPC status.
 * Note that calls that fail for other reasons (e.g. network failure) will not be retried.
 */
export const responseNotOk = (
  shouldRetry: (error: Grpc.Error) => boolean,
  maxRetries = 2,
  beforeRetry: (attempt: number) => Observable<void> = _ => of(undefined),
): RetryPolicy => ({
  shouldRetry,
  maxRetries,
  beforeRetry,
})

const isGrpcError = (error: unknown): error is Grpc.Error => {
  if (!error) {
    return false
  }
  const grpcError = error as Grpc.Error
  return "code" in grpcError && "message" in grpcError
}

/**
 * Add automatic retry to a gRPC call {@link Observable}.
 *
 * - If the error does not match the retry policy's shouldRetry condition, the call is not retried and
 *   the Observable fails with the error from the gRPC call
 * - If the error is retryable and exceeds the maximum retry attempts, the call fails with the error
 * - If the provided beforeRetry() Observable fails then the call fails with the error from beforeRetry
 * - Otherwise the call from the source observable is retried with a configurable exponential backoff
 *
 * @param retryPolicy - a RetryPolicy that specifies whether and when to retry
 */
export const retry = (retryPolicy: RetryPolicy) => <T>(source: Observable<T>): Observable<T> =>
  source.pipe(
    retryWhen((errors: Observable<unknown>) =>
      errors.pipe(
        mergeMap((error: unknown, attempt: number) => {
          if (!isGrpcError(error)) {
            return throwError(error)
          }
          return iif(
            () => attempt < retryPolicy.maxRetries && retryPolicy.shouldRetry(error),
            retryPolicy.beforeRetry(attempt).pipe(
              catchError(e => e
                ? throwError(e)
                : throwError(new Error("beforeRetry failed with undefined error")))
            ),
            throwError(error)
          )
        }),
      ),
    )
  )
