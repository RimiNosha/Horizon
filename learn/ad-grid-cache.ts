/**
 * @module ad-grid-cache
 * Keeps the most recent ad each character posted in a channel, so the ad
 * posters grid can show ads that are no longer in the visible message list
 * (for example after reconnecting or scrolling back). Postings older than
 * {@link AdGridCache.MAX_AGE_MS} are dropped, and the cache is persisted to
 * disk so it survives restarts and carries over across characters.
 */

import { emptyMap } from '../fchat/common';
import { Cache } from './cache';

export interface GridAdPosting {
  channelId: string;
  name: string;
  message: string;
  time: Date;
}

export interface GridPoster {
  name: string;
  text: string;
  time: Date;
}

/**
 * A poster in the on-disk format, with the posting time serialized as an ISO
 * string so it survives JSON round-tripping.
 */
export interface RawGridPoster {
  name: string;
  text: string;
  time: string;
}

export class AdGridRecord {
  /**
   * @constant
   * How long a posting stays in the grid before it is cleaned up.
   */
  static readonly MAX_AGE_MS = 12 * 60 * 60 * 1000;

  private readonly posters = new Map<string, GridPoster>();

  /**
   * Records an ad, keeping only the newest posting per character.
   * @param ad The ad that was just posted in this channel.
   * @internal
   */
  add(ad: GridAdPosting): void {
    const key = Cache.nameKey(ad.name);
    const previous = this.posters.get(key);

    if (previous && previous.time >= ad.time) return;

    this.posters.set(key, {
      name: ad.name,
      text: ad.message,
      time: previous?.time || ad.time // Don't bring posters back to the bottom if we've already seen them
    });
  }

  /**
   * Returns the posters still within {@link AdGridRecord.MAX_AGE_MS}, dropping
   * the ones that have aged out as we read them.
   * @internal
   */
  getFresh(): GridPoster[] {
    const cutoff = Date.now() - AdGridRecord.MAX_AGE_MS;

    for (const [key, poster] of [...this.posters]) {
      if (poster.time.getTime() < cutoff) this.posters.delete(key);
    }

    return [...this.posters.values()].sort(
      (a, b) => a.time.getTime() - b.time.getTime()
    );
  }

  /**
   * Serializes the still-fresh postings for disk storage, with dates as ISO
   * strings.
   * @internal
   */
  serialize(): RawGridPoster[] {
    return this.getFresh().map(p => ({
      name: p.name,
      text: p.text,
      time: p.time.toISOString()
    }));
  }

  /**
   * Clears every posting in this channel.
   * @internal
   */
  clear(): void {
    this.posters.clear();
  }
}

export class AdGridCache extends Cache<AdGridRecord> {
  /**
   * Records an ad under its channel, keeping the newest posting per character.
   * @param ad The posting to record.
   */
  register(ad: GridAdPosting): void {
    const k = Cache.nameKey(ad.channelId);

    if (!(k in this.cache)) this.cache[k] = new AdGridRecord();

    this.cache[k].add(ad);
  }

  /**
   * Returns the fresh posters stored for a channel, oldest first.
   * @param channelId Channel to read.
   */
  getPosters(channelId: string): GridPoster[] {
    const record = this.cache[Cache.nameKey(channelId)];

    return record ? record.getFresh() : [];
  }

  /**
   * Forgets every posting of a channel.
   * @param channelId Channel to forget.
   */
  deregister(channelId: string): void {
    delete this.cache[Cache.nameKey(channelId)];
  }

  reset(): void {
    this.cache = emptyMap();
  }

  /**
   * Serializes every channel's fresh postings for disk storage, tagging each
   * posting with its channel id so {@link AdGridCache.load} can re-key them.
   */
  serialize(): Record<string, RawGridPoster[]> {
    const out = emptyMap<RawGridPoster[]>();

    for (const key in this.cache) {
      const postings = this.cache[key].serialize();
      if (postings.length > 0) out[key] = postings;
    }

    return out;
  }

  /**
   * Rebuilds the cache from persisted data, ignoring malformed records and
   * postings that have already aged out.
   * @param {any} raw The parsed contents of the ad grid file, or null.
   */
  load(raw: any): void {
    if (typeof raw !== 'object' || raw === null) return;

    const cutoff = Date.now() - AdGridRecord.MAX_AGE_MS;

    for (const [channelId, postings] of Object.entries<any>(raw)) {
      if (!Array.isArray(postings)) continue;

      for (const posting of postings) {
        if (
          typeof posting?.name !== 'string' ||
          typeof posting?.text !== 'string'
        )
          continue;

        const time = new Date(posting.time);
        if (isNaN(time.getTime()) || time.getTime() < cutoff) continue;

        this.register({
          channelId,
          name: posting.name,
          message: posting.text,
          time
        });
      }
    }
  }
}
