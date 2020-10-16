# gRPC Web Rx

gRPC Web Rx is a TypeScript library that integrates RxJS with gRPC Web.

## Quick Start

Pre-requisites (the following tools need to be installed first):

- [protoc](https://github.com/protocolbuffers/protobuf/releases)
- [protoc-gen-grpc-web](https://github.com/grpc/grpc-web/releases)
- [Docker](https://docs.docker.com/get-docker/) - needed for running local Envoy proxy

Run tests by executing the following command:

`$ make test`

This starts a local gRPC node server together with an Envoy proxy (via Docker) where the tests are run against.

## Usage

The library provides a `fromGrpc` creation operator and a `retryWithGrpc` error handling operator for wrapping
gRPC-web calls with a `rxjs.Observable` plus support for configurable retry policies.

Retries are executed with exponential backoff based off of the interval (in milliseconds) from the provided
retry policy.

```javascript
const grpcClient = new FooClient("http://localhost:8080");

// fromGrpc returns an Observable
fromGrpc<FooResponse>(() => grpcClient.foo(new FooRequest(), {}))
  .subscribe({
    next: data => console.log(data.getBar()),
    error: error => console.log(error),
    complete: () => console.log("complete")
  })

// using retryWithGrpc with custom retry policy
const retryPolicy = {
  shouldRetry: (error: grpcWeb.Error) => error.code == grpcWeb.StatusCode.PERMISSION_DENIED,
  maxRetries: 2,
  beforeRetry: () => {
    return Promise.resolve()
  },
  intervalMs: 500
}

fromGrpc<FooResponse>(() => grpcClient.foo(new FooRequest(), {}))
  .pipe(retryWithGrpc(retryPolicy))
  .subscribe({
    next: data => console.log(data.getBar()),
    error: error => console.log(error),
    complete: () => console.log("complete")
  })
```

## Limitations

- This library only supports unary and server-streaming gRPC calls.
