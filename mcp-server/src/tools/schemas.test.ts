import { describe, it, expect } from 'vitest';
import {
  XSearchPostsInput,
  XSearchUsersInput,
  XGetPostInput,
  XGetUserProfileInput,
  XGetUserTimelineInput,
  XGetFollowersInput,
  XGetRepliesTreeInput,
  XPostTweetInput,
  XReplyInput,
  XLikeUnlikeInput,
  XFollowUnfollowInput,
  XSendDmInput,
} from './schemas.js';

describe('XSearchPostsInput', () => {
  it('accepts minimal input with defaults', () => {
    const parsed = XSearchPostsInput.parse({ query: 'AI agents' });
    expect(parsed.query).toBe('AI agents');
    expect(parsed.maxResults).toBe(25);
    expect(parsed.accountId).toBe('default');
  });

  it('accepts full input with date filters', () => {
    const parsed = XSearchPostsInput.parse({
      query: 'mcp protocol',
      allowedHandles: ['@anthropic', '@modelcontext'],
      excludedHandles: ['@spam'],
      fromDate: '2026-01-01',
      toDate: '2026-05-14',
      maxResults: 50,
    });
    expect(parsed.allowedHandles).toHaveLength(2);
    expect(parsed.fromDate).toBe('2026-01-01');
    expect(parsed.maxResults).toBe(50);
  });

  it('rejects empty query', () => {
    expect(() => XSearchPostsInput.parse({ query: '' })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() =>
      XSearchPostsInput.parse({ query: 'x', fromDate: '01/01/2026' }),
    ).toThrow();
  });

  it('rejects maxResults > 100', () => {
    expect(() =>
      XSearchPostsInput.parse({ query: 'x', maxResults: 500 }),
    ).toThrow();
  });

  it('rejects query > 500 chars', () => {
    expect(() =>
      XSearchPostsInput.parse({ query: 'a'.repeat(501) }),
    ).toThrow();
  });
});

describe('XSearchUsersInput', () => {
  it('accepts valid query', () => {
    const parsed = XSearchUsersInput.parse({ query: 'devrel ai' });
    expect(parsed.maxResults).toBe(25);
  });

  it('rejects query > 200 chars', () => {
    expect(() => XSearchUsersInput.parse({ query: 'a'.repeat(201) })).toThrow();
  });
});

describe('XGetPostInput', () => {
  it('accepts valid postId', () => {
    const parsed = XGetPostInput.parse({ postId: '1820374560000000000' });
    expect(parsed.postId).toBe('1820374560000000000');
  });

  it('rejects empty postId', () => {
    expect(() => XGetPostInput.parse({ postId: '' })).toThrow();
  });

  it('rejects postId > 50 chars', () => {
    expect(() => XGetPostInput.parse({ postId: '1'.repeat(51) })).toThrow();
  });
});

describe('XGetUserProfileInput', () => {
  it('accepts valid username', () => {
    const parsed = XGetUserProfileInput.parse({ username: 'elonmusk' });
    expect(parsed.username).toBe('elonmusk');
  });

  it('accepts username with underscores and digits', () => {
    const parsed = XGetUserProfileInput.parse({ username: 'user_123_test' });
    expect(parsed.username).toBe('user_123_test');
  });

  it('rejects username with @ prefix', () => {
    expect(() =>
      XGetUserProfileInput.parse({ username: '@elonmusk' }),
    ).toThrow();
  });

  it('rejects username with hyphen', () => {
    expect(() =>
      XGetUserProfileInput.parse({ username: 'el-on' }),
    ).toThrow();
  });

  it('rejects empty username', () => {
    expect(() => XGetUserProfileInput.parse({ username: '' })).toThrow();
  });
});

describe('XGetUserTimelineInput', () => {
  it('accepts valid userId', () => {
    const parsed = XGetUserTimelineInput.parse({ userId: '44196397' });
    expect(parsed.maxResults).toBe(25);
  });

  it('respects max 100', () => {
    const parsed = XGetUserTimelineInput.parse({
      userId: '44196397',
      maxResults: 100,
    });
    expect(parsed.maxResults).toBe(100);
  });

  it('rejects maxResults > 100', () => {
    expect(() =>
      XGetUserTimelineInput.parse({ userId: '1', maxResults: 200 }),
    ).toThrow();
  });
});

describe('XGetFollowersInput', () => {
  it('accepts maxResults up to 1000', () => {
    const parsed = XGetFollowersInput.parse({ userId: '1', maxResults: 1000 });
    expect(parsed.maxResults).toBe(1000);
  });

  it('rejects maxResults > 1000', () => {
    expect(() =>
      XGetFollowersInput.parse({ userId: '1', maxResults: 1001 }),
    ).toThrow();
  });
});

describe('XGetRepliesTreeInput', () => {
  it('default maxResults is 100', () => {
    const parsed = XGetRepliesTreeInput.parse({ conversationId: '123' });
    expect(parsed.maxResults).toBe(100);
  });

  it('cap at 500', () => {
    const parsed = XGetRepliesTreeInput.parse({
      conversationId: '123',
      maxResults: 500,
    });
    expect(parsed.maxResults).toBe(500);
  });
});

describe('XPostTweetInput', () => {
  it('accepts tweet under 280 chars with confirm', () => {
    const parsed = XPostTweetInput.parse({ text: 'Hello world', confirm: true });
    expect(parsed.confirm).toBe(true);
  });

  it('defaults confirm to false (preview mode)', () => {
    const parsed = XPostTweetInput.parse({ text: 'Draft tweet' });
    expect(parsed.confirm).toBe(false);
  });

  it('rejects tweet over 280 chars', () => {
    expect(() =>
      XPostTweetInput.parse({ text: 'x'.repeat(281) }),
    ).toThrow();
  });

  it('rejects empty text', () => {
    expect(() => XPostTweetInput.parse({ text: '' })).toThrow();
  });

  it('rejects > 4 media ids', () => {
    expect(() =>
      XPostTweetInput.parse({
        text: 'x',
        mediaIds: ['1', '2', '3', '4', '5'],
      }),
    ).toThrow();
  });
});

describe('XReplyInput', () => {
  it('requires inReplyToTweetId', () => {
    expect(() =>
      XReplyInput.parse({ text: 'reply' } as never),
    ).toThrow();
  });

  it('accepts valid reply', () => {
    const parsed = XReplyInput.parse({
      inReplyToTweetId: '12345',
      text: 'Great point!',
    });
    expect(parsed.confirm).toBe(false);
  });
});

describe('XLikeUnlikeInput', () => {
  it('defaults unlike to false', () => {
    const parsed = XLikeUnlikeInput.parse({ tweetId: '12345' });
    expect(parsed.unlike).toBe(false);
  });

  it('accepts unlike=true', () => {
    const parsed = XLikeUnlikeInput.parse({ tweetId: '12345', unlike: true });
    expect(parsed.unlike).toBe(true);
  });
});

describe('XFollowUnfollowInput', () => {
  it('requires targetUserId', () => {
    expect(() => XFollowUnfollowInput.parse({} as never)).toThrow();
  });

  it('defaults unfollow to false', () => {
    const parsed = XFollowUnfollowInput.parse({ targetUserId: '1' });
    expect(parsed.unfollow).toBe(false);
  });
});

describe('XSendDmInput', () => {
  it('accepts dm under 10000 chars', () => {
    const parsed = XSendDmInput.parse({
      recipientId: '1',
      text: 'Hello',
    });
    expect(parsed.confirm).toBe(false);
  });

  it('rejects dm over 10000 chars', () => {
    expect(() =>
      XSendDmInput.parse({
        recipientId: '1',
        text: 'x'.repeat(10001),
      }),
    ).toThrow();
  });

  it('rejects empty text', () => {
    expect(() =>
      XSendDmInput.parse({ recipientId: '1', text: '' }),
    ).toThrow();
  });
});

describe('accountId regex', () => {
  it('accepts default omission', () => {
    const parsed = XGetPostInput.parse({ postId: '1' });
    expect(parsed.accountId).toBe('default');
  });

  it('accepts lowercase + digits + dash + underscore', () => {
    const parsed = XGetPostInput.parse({
      postId: '1',
      accountId: 'team-1_alpha',
    });
    expect(parsed.accountId).toBe('team-1_alpha');
  });

  it('rejects uppercase accountId', () => {
    expect(() =>
      XGetPostInput.parse({ postId: '1', accountId: 'Team1' }),
    ).toThrow();
  });

  it('rejects accountId with spaces', () => {
    expect(() =>
      XGetPostInput.parse({ postId: '1', accountId: 'my team' }),
    ).toThrow();
  });
});
