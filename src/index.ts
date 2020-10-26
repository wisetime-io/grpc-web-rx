// Copyright (c) 2020 WiseTime. All rights reserved.

import { fromGrpc, never, responseNotOk, retryAfter, RetryPolicy, retryWithGrpc, } from "./client"

export const from = fromGrpc
export const retry = retryWithGrpc
export { never, responseNotOk, retryAfter }
export type { RetryPolicy }
