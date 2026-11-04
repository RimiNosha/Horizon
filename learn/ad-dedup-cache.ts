/**
 * @module ad-dedup-cache
 * Tracks the ads already posted in each channel, so that repeats by the same
 * character can be hidden from the view while still staying in the conversation
 * arrays and on disk.
 */

import { emptyMap } from '../fchat/common';
import { Cache } from './cache';

export interface DuplicateAdPosting {
  channelId: string;
  name: string;
  message: string;
}

/**
 * Collapses whitespace and casing so that ads which only differ in trailing
 * newlines or indentation are still recognised as the same posting.
 */
function normalizeAdText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export class DuplicateAdRecord {
  /**
   * @constant
   * Highest number of postings tracked for a single channel. Older entries are
   * dropped once this is reached, so a long-running channel cannot grow the
   * cache without bound.
   */
  static readonly MAX_POSTINGS = 2000;

  // Sets keep insertion order, which lets the oldest postings be dropped first.
  private readonly postings = new Set<string>();

  /**
   * @function
   * @param {DuplicateAdPosting} ad
   * The ad that was just posted in this channel.
   * @returns {boolean}
   * `true` when this is the first time the posting is seen, `false` when the
   * same character had already posted identical text in the channel.
   * @internal
   */
  add(ad: DuplicateAdPosting): boolean {
    const key = DuplicateAdRecord.keyOf(ad);

    if (this.postings.has(key)) return false;

    this.postings.add(key);

    if (this.postings.size > DuplicateAdRecord.MAX_POSTINGS) {
      const oldest = this.postings.values().next();
      if (!oldest.done) this.postings.delete(oldest.value);
    }

    return true;
  }

  /**
   * Ads are only considered repeats when the same character posted them, so a
   * different advertiser serving identical text is never treated as a duplicate.
   */
  static keyOf(ad: DuplicateAdPosting): string {
    return `${Cache.nameKey(ad.name)}|${normalizeAdText(ad.message)}`;
  }
}

export class DuplicateAdCache extends Cache<DuplicateAdRecord> {
  /**
   * @function
   * @param {DuplicateAdPosting} ad
   * The posting to record under its channel.
   * @returns {boolean}
   * `true` when the posting had not been seen in that channel before.
   */
  register(ad: DuplicateAdPosting): boolean {
    const k = Cache.nameKey(ad.channelId);

    if (!(k in this.cache)) this.cache[k] = new DuplicateAdRecord();

    return this.cache[k].add(ad);
  }

  /**
   * Forgets the recorded postings of a channel, so that ads posted afterwards
   * are measured against a fresh history rather than one that is no longer
   * shown.
   * @param channelId Channel to forget.
   */
  deregister(channelId: string): void {
    delete this.cache[Cache.nameKey(channelId)];
  }

  reset(): void {
    this.cache = emptyMap();
  }
}
