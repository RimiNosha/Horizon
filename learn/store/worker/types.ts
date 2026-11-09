export type ProfileStoreCommand =
  | 'flush'
  | 'start'
  | 'stop'
  | 'update-meta'
  | 'store'
  | 'get'
  | 'init';

/**
 * `'low'` requests are parked on the client until the worker's main queue is
 * drained; use it for bulk background reads that must not compete with
 * interactive requests. Never sent to the worker itself.
 */
export type RequestPriority = 'normal' | 'low';

export interface IndexedRequest {
  cmd: ProfileStoreCommand;
  id: string;
  params: Record<string, any>;
}

export interface IndexedResponse {
  id: string;
  type: 'event' | 'res';
  state: 'err' | 'ok';
  result?: any;
  msg?: string;
}
