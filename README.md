# gRPC-Web-Rx

gRPC-Web-Rx is a TypeScript library that integrates [gRPC-Web](https://github.com/grpc/grpc-web) with [RxJS](https://github.com/ReactiveX/rxjs). gRPC-Web-Rx provides a convenience `from` operator that you can use to wrap your gRPC call to obtain an `Observable` of the response. Currently unary and server streaming RPCs are supported.

gRPC Call Type | Input and Output Types
--- | ---
Unary | `Request => Observable<Response>`
Server streaming | `Request => Observable<Response>`
Client streaming | Not yet supported by gRPC-Web
Bidirectional streaming | Not yet supported by gRPC-Web

## Usage

You can install the `grpc-web-rx` module via [npm](https://github.com/npm/cli):

```text
npm i grpc-web-rx
```

Let's look at a hypothetical Todo service, defined using [Protocol Buffers](https://developers.google.com/protocol-buffers) as:

```protobuf
syntax = "proto3";
package wisetime.todo.v1;

service TodoService {
  // Use this unary RPC to create todo items.
  rpc CreateTodo(CreateTodoRequest) returns (Todo);
  
  // Subscribe to this server streaming RPC to receive todo list updates.
  rpc WatchTodos(WatchTodosRequest) returns (stream TodoList);
}

message Todo {
  string id = 1;
  string title = 2;
  bool completed = 3;
}

message CreateTodoRequest {
  string title = 1;
}

message WatchTodosRequest {}

message TodoList {
  repeated Todo todos = 1;
}
```

In order to use gRPC-Web, we need to generate the client library from using [protoc](https://github.com/protocolbuffers/protobuf#protocol-compiler-installation) and the [gRPC-Web protoc plugin](https://github.com/grpc/grpc-web#code-generator-plugin):

```text
protoc -I=src/protobuf src/protobuf/todo.proto \
  --js_out=import_style=commonjs,binary:src/generated \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:src/generated
```

### The `from` Operator

The `from` operator executes a gRPC call and provides an `Observable` of the response.

```typescript
import { from } from "grpc-web-rx"
import { CreateTodoRequest, WatchTodoRequest } from "./generated/todo_pb"
import { TodoServiceClient } from "./generated/TodoServiceClientPb"

const client = new TodoServiceClient("http://localhost:8080")

// An example unary call.
from(() => client.createTodo(new CreateTodoRequest().setTitle("Buy milk")))
  .subscribe(
    response => console.log(`Todo created with ID: ${response.id}`),
    error => console.error(`Received error status code: ${error.code}`)
  )

// An example server streaming call: Subscribing to an update stream.
from(() => client.watchTodos(new WatchTodosRequest()))
  .subscribe({
    next: todos => console.log(`Received updated todo list: ${todos}`),
    error: error => console.error(`Received error status code: ${error.code}`)
    complete: () => console.log("Notification stream has ended")
  })
```

### Automatic Retries

gRPC-Web-Rx also provides a `retry` operator for retrying calls that fail with a non-OK [gRPC Status](https://github.com/grpc/grpc/blob/master/doc/statuscodes.md).

In the following example, we configure a `RetryPolicy` that will retry calls that fail with status code `PERMISSION_DENIED`. The call is retried up to 3 times with an initial delay of 200ms. The delay increases exponentially for each subsequent attempt. In this example, the `refreshIdToken()` function is called before each attempt.

```typescript
import Grpc from "grpc-web"
import { from, retry, addExponentialDelay } from "grpc-web-rx"
import { CreateTodoRequest } from "./generated/todo_pb"

const policy = {
  shouldRetry: error => error.code == Grpc.StatusCode.PERMISSION_DENIED,
  maxRetries: 3,
  beforeRetry: addExponentialDelay(200)(refreshIdToken()),
}

from(() => client.createTodo(new CreateTodoRequest().setTitle("Very important task!")))
  .pipe(retry(policy))
  .subscribe(
    response => console.log(`Todo created with ID: ${response.id}`),
    error => console.error(`Received error status code: ${error.code}`)
  )
```

## Contributing

You will need to install the following tools to work on gRPC-Web-Rx:

- [protoc](https://github.com/protocolbuffers/protobuf/releases)
- [protoc-gen-grpc-web](https://github.com/grpc/grpc-web/releases)
- [Docker](https://docs.docker.com/get-docker/) is needed to run a local Envoy proxy for integration tests

Run tests by executing the following command:

```text
$ make test-local
```

This starts a local gRPC node server together with an Envoy proxy (via Docker) where the tests will be run against.
