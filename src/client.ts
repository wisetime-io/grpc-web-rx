// Copyright (c) 2020 WiseTime. All rights reserved.

import Grpc from "grpc-web"
import { Observable, Subscriber } from "rxjs"

type UnaryRpc<T> = () => Promise<T>
type ServerStreamingRpc = () => Grpc.ClientReadableStream<unknown>

const isServerStreaming =
  <T>(response: ReturnType<UnaryRpc<T>> | ReturnType<ServerStreamingRpc>): response is ReturnType<ServerStreamingRpc> =>
    "on" in response

const fromServerStreaming = <T>(call: Grpc.ClientReadableStream<unknown>, observer: Subscriber<T>): void => {
  call.on("data", data =>
    data !== undefined
      ? observer.next(data as T)
      : observer.error(new Error("Response payload is undefined"))
  )
  call.on("error", error => observer.error(error))
  call.on("status", status => {
    if (status.code == Grpc.StatusCode.OK) {
      observer.complete()
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
 * Create an {@link Observable} from a gRPC call.
 *
 * Currently only supports unary and server streaming RPCs because {@link gRPC-web|https://github.com/grpc/grpc-web}
 * only supports those for now.
 *
 * @param rpc - gRPC-web call which can either be unary or server-streaming
 */
export const from = <T>(rpc: UnaryRpc<T> | ServerStreamingRpc): Observable<T> =>
  new Observable<T>(observer => {
    const call = rpc()
    if (isServerStreaming<T>(call)) {
      fromServerStreaming(call, observer)
    } else {
      fromUnary(call, observer)
    }
  })
