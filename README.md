# gRPC-Web-Rx

gRPC-Web-Rx is a TypeScript library that integrates [gRPC-Web](https://github.com/grpc/grpc-web) with [RxJS](https://github.com/ReactiveX/rxjs).

## Usage

gRPC-Web-Rx provides a `from` operator that creates an `Observable` from a gRPC call. The library also provides a `retry` operator for retrying failed calls.

```typescript
const grpcClient = new FooClient("http://localhost:8081");

// from returns an Observable
from<FooResponse>(() => grpcClient.foo(new FooRequest(), {}))
  .subscribe({
    next: data => console.log(data.getBar()),
    error: error => console.log(error),
    complete: () => console.log("complete")
  })

// using retry with custom retry policy
// add exponential backoff to your beforeRetry callback by using the addExponentialDelay convenience function
const withDelay = addExponentialDelay<void>(2000, 60_000)
const beforeRetry = withDelay(of(undefined))
const retryPolicy = {
  shouldRetry: (error: Grpc.Error) => error.code == Grpc.StatusCode.PERMISSION_DENIED,
  maxRetries: 2,
  beforeRetry: (attempt: number) => of("something that resolves"),
}

from<FooResponse>(() => grpcClient.foo(new FooRequest(), {}))
  .pipe(retry(retryPolicy))
  .subscribe({
    next: data => console.log(data.getBar()),
    error: error => console.log(error),
    complete: () => console.log("complete")
  })

// alternatively you can use the pre-configured retry policies
.pipe(retry(never))

.pipe(retry(responseNotOk)) // only retries if response status code != 200

.pipe(retry(retryAfter(1000))) // retries requests with exponential backoff starting at 1 second
```

## Limitations

- This library only supports unary and server streaming gRPC calls.

## Contributing

You will need to install the following to work on gRPC-Web-Rx:

- [protoc](https://github.com/protocolbuffers/protobuf/releases)
- [protoc-gen-grpc-web](https://github.com/grpc/grpc-web/releases)
- [Docker](https://docs.docker.com/get-docker/) is needed to run a local Envoy proxy for integration tests

Run tests by executing the following command:

```text
$ make test-local
```

This starts a local gRPC node server together with an Envoy proxy (via Docker) where the tests will be run against.

