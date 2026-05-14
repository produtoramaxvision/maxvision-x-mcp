/**
 * Zod input schemas for X MCP tools (raw shape objects + parsed schema exports).
 *
 * SDK 1.x `server.registerTool` accepts raw object shapes — we export both.
 */
import { z } from 'zod';

const accountId = z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/).default('default');

// ---------- READ tools (Layer A/B/C/D) ----------

export const XSearchPostsInputShape = {
  accountId: accountId.optional(),
  query: z.string().min(1).max(500),
  allowedHandles: z.array(z.string()).optional(),
  excludedHandles: z.array(z.string()).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxResults: z.number().int().min(1).max(100).default(25),
};
export const XSearchPostsInput = z.object(XSearchPostsInputShape);

export const XSearchUsersInputShape = {
  accountId: accountId.optional(),
  query: z.string().min(1).max(200),
  maxResults: z.number().int().min(1).max(100).default(25),
};
export const XSearchUsersInput = z.object(XSearchUsersInputShape);

export const XGetPostInputShape = {
  accountId: accountId.optional(),
  postId: z.string().min(1).max(50),
};
export const XGetPostInput = z.object(XGetPostInputShape);

export const XGetUserProfileInputShape = {
  accountId: accountId.optional(),
  username: z.string().min(1).max(50).regex(/^[A-Za-z0-9_]+$/),
};
export const XGetUserProfileInput = z.object(XGetUserProfileInputShape);

export const XGetUserTimelineInputShape = {
  accountId: accountId.optional(),
  userId: z.string().min(1).max(50),
  maxResults: z.number().int().min(1).max(100).default(25),
};
export const XGetUserTimelineInput = z.object(XGetUserTimelineInputShape);

export const XGetFollowersInputShape = {
  accountId: accountId.optional(),
  userId: z.string().min(1).max(50),
  maxResults: z.number().int().min(1).max(1000).default(100),
};
export const XGetFollowersInput = z.object(XGetFollowersInputShape);

export const XGetFollowingInputShape = {
  accountId: accountId.optional(),
  userId: z.string().min(1).max(50),
  maxResults: z.number().int().min(1).max(1000).default(100),
};
export const XGetFollowingInput = z.object(XGetFollowingInputShape);

export const XGetRepliesTreeInputShape = {
  accountId: accountId.optional(),
  conversationId: z.string().min(1).max(50),
  maxResults: z.number().int().min(1).max(500).default(100),
};
export const XGetRepliesTreeInput = z.object(XGetRepliesTreeInputShape);

export const XPostMetricsInputShape = {
  accountId: accountId.optional(),
  postId: z.string().min(1).max(50),
};
export const XPostMetricsInput = z.object(XPostMetricsInputShape);

export const XProfileActivityInputShape = {
  accountId: accountId.optional(),
  handle: z.string().min(1).max(50).regex(/^[A-Za-z0-9_]+$/),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxResults: z.number().int().min(1).max(100).default(25),
};
export const XProfileActivityInput = z.object(XProfileActivityInputShape);

// ---------- WRITE tools (Layer B, Pro/Agency only) ----------

export const XPostTweetInputShape = {
  accountId: accountId.optional(),
  text: z.string().min(1).max(280),
  mediaIds: z.array(z.string()).max(4).optional(),
  confirm: z.boolean().default(false),
};
export const XPostTweetInput = z.object(XPostTweetInputShape);

export const XReplyInputShape = {
  accountId: accountId.optional(),
  inReplyToTweetId: z.string().min(1).max(50),
  text: z.string().min(1).max(280),
  confirm: z.boolean().default(false),
};
export const XReplyInput = z.object(XReplyInputShape);

export const XQuoteTweetInputShape = {
  accountId: accountId.optional(),
  quotedTweetId: z.string().min(1).max(50),
  text: z.string().min(1).max(280),
  confirm: z.boolean().default(false),
};
export const XQuoteTweetInput = z.object(XQuoteTweetInputShape);

export const XLikeUnlikeInputShape = {
  accountId: accountId.optional(),
  tweetId: z.string().min(1).max(50),
  unlike: z.boolean().default(false),
};
export const XLikeUnlikeInput = z.object(XLikeUnlikeInputShape);

export const XFollowUnfollowInputShape = {
  accountId: accountId.optional(),
  targetUserId: z.string().min(1).max(50),
  unfollow: z.boolean().default(false),
};
export const XFollowUnfollowInput = z.object(XFollowUnfollowInputShape);

export const XSendDmInputShape = {
  accountId: accountId.optional(),
  recipientId: z.string().min(1).max(50),
  text: z.string().min(1).max(10000),
  confirm: z.boolean().default(false),
};
export const XSendDmInput = z.object(XSendDmInputShape);
