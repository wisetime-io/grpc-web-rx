// Copyright (c) 2020 WiseTime. All rights reserved.

import { fromGrpc, RetryPolicy, retryWithGrpc } from "./client"

export const from = fromGrpc
export const retry = retryWithGrpc
export type { RetryPolicy }
