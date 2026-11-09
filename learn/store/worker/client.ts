import _ from 'lodash';
import log from 'electron-log'; //tslint:disable-line:match-default-export-name

import {
  IndexedRequest,
  IndexedResponse,
  ProfileStoreCommand,
  RequestPriority
} from './types';

export interface WaiterDef {
  id: string;
  resolve(result?: any): void;
  reject(result?: any): void;
  initiated: number;
  request: IndexedRequest;
}

/** A low-priority request that hasn't reached the worker yet. */
interface DeferredRequest {
  id: string;
  resolve(result?: any): void;
  reject(result?: any): void;
  request: IndexedRequest;
}

export class WorkerClient {
  // @ts-ignore
  private _isVue = true;

  private readonly worker: Worker;

  private idCounter = 0;

  private waiters: WaiterDef[] = [];

  /** Background requests parked until the main queue drains. */
  private deferred: DeferredRequest[] = [];

  constructor(jsFile: string) {
    this.worker = new Worker(jsFile);
    this.worker.onmessage = this.generateMessageProcessor();
  }

  private generateId(): string {
    this.idCounter++;

    return `wc-${this.idCounter}`;
  }

  private when(
    id: string,
    resolve: (result?: any) => void,
    reject: (reason?: any) => void,
    request: IndexedRequest
  ): void {
    this.waiters.push({ id, resolve, reject, request, initiated: Date.now() });
  }

  private generateMessageProcessor(): (e: Event) => void {
    return (e: Event) => {
      const res = (e as any).data as IndexedResponse;

      // log.silly('store.worker.client.msg', { res });

      if (!res) {
        log.error('store.worker.client.msg.invalid', { res });
        return;
      }

      const waiter = _.find(this.waiters, w => w.id === res.id);

      if (!waiter) {
        log.error('store.worker.client.msg.unknown', { res });
        return;
      }

      if (res.state === 'ok') {
        const t = Date.now() - waiter.initiated;

        if (t > 200) {
          log.info('store.worker.client.msg.slow', {
            t: t / 1000,
            req: waiter.request,
            res
          });
        }

        waiter.resolve(res.result);
      } else {
        log.error('store.worker.client.msg.err', {
          t: (Date.now() - waiter.initiated) / 1000,
          msg: res.msg,
          req: waiter.request
        });
        waiter.reject(new Error(res.msg));
      }

      this.clearWaiter(waiter.id);
    };
  }

  private clearWaiter(id: string, flush = true): void {
    this.waiters = _.filter(this.waiters, w => w.id !== id);

    // log.silly('store.worker.waiter.clear', this.waiters.length);

    // ^ The worker is free again; let parked background work advance
    if (flush) {
      this.flushDeferred();
    }
  }

  /**
   * Releases low-priority requests only while nothing else is in flight, and one
   * at a time. Rendering a busy channel can fire hundreds of profile lookups at
   * once (ad grid tiles, member rows); posting all of them immediately floods the
   * worker with concurrent IndexedDB transactions and stalls interactive requests.
   */
  private flushDeferred(): void {
    while (this.waiters.length === 0 && this.deferred.length > 0) {
      const next = this.deferred.shift()!;

      try {
        this.when(next.id, next.resolve, next.reject, next.request);

        this.worker.postMessage(next.request);
      } catch (err) {
        next.reject(err);
        // Don't flush from here; the loop below keeps draining
        this.clearWaiter(next.id, false);
      }
    }
  }

  async request(
    cmd: ProfileStoreCommand,
    params: Record<string, any> = {},
    priority: RequestPriority = 'normal'
  ): Promise<any> {
    const id = this.generateId();

    const request: IndexedRequest = {
      cmd,
      id,
      params
    };

    return new Promise((resolve, reject) => {
      if (priority === 'low') {
        // ^ Wait for the main queue to complete before touching the worker
        this.deferred.push({ id, resolve, reject, request });

        this.flushDeferred();
        return;
      }

      try {
        this.when(id, resolve, reject, request);

        this.worker.postMessage(request);
      } catch (err) {
        reject(err);
        this.clearWaiter(id);
      }
    });
  }
}
