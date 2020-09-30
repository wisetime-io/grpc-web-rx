// Copyright (c) 2020 WiseTime. All rights reserved.

import { Observable } from "rxjs"
import * as grpcWeb from "grpc-web"

export const fromServerStreamingRpc = <Resp>(serverStreaming: grpcWeb.ClientReadableStream<Resp>): Observable<Resp> => {
  return new Observable(observer => {
    serverStreaming
      .on("data", (data: Resp) => observer.next(data))
      .on("error", (error: grpcWeb.Error) => observer.error(error))
      .on("end", () => observer.complete())
  })
}
