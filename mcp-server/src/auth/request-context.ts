import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  licenseKey?: string;
  apiKeyId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext {
  return storage.getStore() ?? {};
}
