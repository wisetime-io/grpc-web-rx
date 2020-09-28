// Copyright (c) 2020 WiseTime. All rights reserved.

import { Observable } from "rxjs"
import * as grpcWeb from "grpc-web"

type RpcCall<Req, Resp> = UnaryRpc<Req, Resp> | ServerStreamingRpc<Req, Resp>
type UnaryRpc<Req, Resp> = (req: Req, metadata: grpcWeb.Metadata | null, callback: (err: grpcWeb.Error, data: Resp) => void) => grpcWeb.ClientReadableStream<Resp>
type ServerStreamingRpc<Req, Resp> = (req: Req, metadata?: grpcWeb.Metadata | undefined) => grpcWeb.ClientReadableStream<any>

// gRPC-Web generated client stub definition
type GrpcClient = {
  client_: grpcWeb.AbstractClientBase,
  hostname_: string,
  credentials_: null | { [index: string]: string },
  options_: null | { [index: string]: any },
}

export class RxGrpcClient {
  readonly grpcClient: GrpcClient
  private metadata: grpcWeb.Metadata

  constructor(grpcClient: GrpcClient) {
    this.grpcClient = grpcClient
    this.metadata = {}
  }

  customHeaders(metadata: grpcWeb.Metadata): this {
    this.metadata = metadata
    return this
  }

  call<Req, Resp>(rpc: RpcCall<Req, Resp>): (request: Req) => Observable<Resp> {
    this.validate(rpc)

    return (req: Req) => {
      if (RxGrpcClient.isUnary(rpc)) {
        return this.unary(rpc)(req)
      } else {
        return this.serverStreamingRpc(rpc)(req)
      }
    }
  }

  private validate<Req, Resp>(rpc: UnaryRpc<Req, Resp> | ServerStreamingRpc<Req, Resp>) {
    const prototype = Object.getPrototypeOf(this.grpcClient)
    for (const name in prototype) {
      if (prototype.hasOwnProperty(name)) {
        const prototypeElement = prototype[name]
        if (typeof prototypeElement === "function" && prototypeElement == rpc) {
          return
        }
      }
    }

    throw new Error("unknown function signature")
  }

  private static isUnary<Req, Resp>(rpc: RpcCall<Req, Resp>): rpc is UnaryRpc<Req, Resp> {
    return (rpc as UnaryRpc<Req, Resp>).length == 3
  }

  private unary<Req, Resp>(rpc: UnaryRpc<Req, Resp>): (request: Req) => Observable<Resp> {
    return (request: Req) => {
      return new Observable<Resp>(observer => {
        rpc.call(this.grpcClient, request, this.metadata, (err: grpcWeb.Error, data: Resp) => {
          if (err) {
            observer.error(err)
          } else {
            observer.next(data)
          }
          observer.complete()
        })
      })
    }
  }

  private serverStreamingRpc<Req, Resp>(rpc: ServerStreamingRpc<Req, Resp>): (request: Req) => Observable<Resp> {
    return (request: Req) => {
      const call = rpc.call(this.grpcClient, request, this.metadata)
      return new Observable<Resp>(observer => {
        call.on("data", (data: Resp) => observer.next(data))
        call.on("error", (error: grpcWeb.Error) => observer.error(error))
        call.on("end", () => observer.complete())
      })
    }
  }
}
