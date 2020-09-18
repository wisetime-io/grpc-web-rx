// Copyright (c) 2020 WiseTime. All rights reserved.

import type { Observable } from "rxjs"

// Make a gRPC call.
export const call = <Request, Response>(rpc: any) => (request: Request): Observable<Response> => {
  // TODO:
  // - Don't use any as rpc type
}

// Make a unary RPC call.
const uCall = <Request, Response>(rpc: any) => (request: Request): Observable<Response> => {
  // TODO
  // - Don't use any as rpc type
}

// Make a server streaming RPC call.
const ssCall = <Request, Response>(rpc: any) => (request: Request): Observable<Response> => {
  // TODO
  // - Don't use any as rpc type
}
