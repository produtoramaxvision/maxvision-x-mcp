/**
 * tools/_registry — wires every tool into the McpServer.
 *
 * Sprint 1 v0.1 — 16 tools (10 read + 6 write).
 *
 * Note: `inputSchema` for `registerTool` is a Zod raw shape (object literal),
 * not `z.object(...)`. The SDK pre-parses; our wrapper re-parses defensively.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  XSearchPostsInputShape,
  XSearchUsersInputShape,
  XGetPostInputShape,
  XGetUserProfileInputShape,
  XGetUserTimelineInputShape,
  XGetFollowersInputShape,
  XGetFollowingInputShape,
  XGetRepliesTreeInputShape,
  XPostMetricsInputShape,
  XProfileActivityInputShape,
  XPostTweetInputShape,
  XReplyInputShape,
  XQuoteTweetInputShape,
  XLikeUnlikeInputShape,
  XFollowUnfollowInputShape,
  XSendDmInputShape,
} from './schemas.js';
import { xSearchPosts } from './x_search_posts.js';
import { xSearchUsers } from './x_search_users.js';
import { xGetPostTool } from './x_get_post.js';
import { xGetUserProfile } from './x_get_user_profile.js';
import { xGetUserTimelineTool } from './x_get_user_timeline.js';
import { xGetFollowersTool } from './x_get_followers.js';
import { xGetFollowingTool } from './x_get_following.js';
import { xGetRepliesTreeTool } from './x_get_replies_tree.js';
import { xPostMetrics } from './x_post_metrics.js';
import { xProfileActivity } from './x_profile_activity.js';
import { xPostTweetTool } from './x_post_tweet.js';
import { xReplyTool } from './x_reply.js';
import { xQuoteTweetTool } from './x_quote_tweet.js';
import { xLikeUnlike } from './x_like_unlike.js';
import { xFollowUnfollow } from './x_follow_unfollow.js';
import { xSendDmTool } from './x_send_dm.js';

export function registerAllTools(server: McpServer): void {
  // ---- Read (10) ----
  server.registerTool(
    'x_search_posts',
    {
      title: 'X Search Posts',
      description: 'Search X posts via xAI Grok x_search (Layer A).',
      inputSchema: XSearchPostsInputShape,
    },
    async (input: unknown) => xSearchPosts(input),
  );
  server.registerTool(
    'x_search_users',
    {
      title: 'X Search Users',
      description: 'Search X users via Grok (Layer A). Pro tier.',
      inputSchema: XSearchUsersInputShape,
    },
    async (input: unknown) => xSearchUsers(input),
  );
  server.registerTool(
    'x_get_post',
    {
      title: 'X Get Post',
      description: 'Fetch a single X post by ID (Layer B X API v2).',
      inputSchema: XGetPostInputShape,
    },
    async (input: unknown) => xGetPostTool(input),
  );
  server.registerTool(
    'x_get_user_profile',
    {
      title: 'X Get User Profile',
      description: 'Fetch a public X user profile by username (Layer B).',
      inputSchema: XGetUserProfileInputShape,
    },
    async (input: unknown) => xGetUserProfile(input),
  );
  server.registerTool(
    'x_get_user_timeline',
    {
      title: 'X Get User Timeline',
      description: 'Fetch recent posts of an X user (Layer B).',
      inputSchema: XGetUserTimelineInputShape,
    },
    async (input: unknown) => xGetUserTimelineTool(input),
  );
  server.registerTool(
    'x_get_followers',
    {
      title: 'X Get Followers',
      description: 'List followers of an X user (Layer B). Pro tier.',
      inputSchema: XGetFollowersInputShape,
    },
    async (input: unknown) => xGetFollowersTool(input),
  );
  server.registerTool(
    'x_get_following',
    {
      title: 'X Get Following',
      description: 'List accounts an X user follows (Layer B). Pro tier.',
      inputSchema: XGetFollowingInputShape,
    },
    async (input: unknown) => xGetFollowingTool(input),
  );
  server.registerTool(
    'x_get_replies_tree',
    {
      title: 'X Get Replies Tree',
      description: 'Fetch replies tree via X API v2 (Layer B, 7-day window) with Patchright fallback (Layer D). Pro tier.',
      inputSchema: XGetRepliesTreeInputShape,
    },
    async (input: unknown) => xGetRepliesTreeTool(input),
  );
  server.registerTool(
    'x_post_metrics',
    {
      title: 'X Post Metrics',
      description: 'Fetch public + non_public metrics for an X post (Layer B).',
      inputSchema: XPostMetricsInputShape,
    },
    async (input: unknown) => xPostMetrics(input),
  );
  server.registerTool(
    'x_profile_activity',
    {
      title: 'X Profile Activity',
      description: 'Get recent activity of an X handle via Grok x_search (Layer A).',
      inputSchema: XProfileActivityInputShape,
    },
    async (input: unknown) => xProfileActivity(input),
  );

  // ---- Write (6) — Pro/Agency tier ----
  server.registerTool(
    'x_post_tweet',
    {
      title: 'X Post Tweet',
      description:
        'Publish a new X tweet (Pro tier). confirm=true to publish; confirm=false returns preview.',
      inputSchema: XPostTweetInputShape,
    },
    async (input: unknown) => xPostTweetTool(input),
  );
  server.registerTool(
    'x_reply',
    {
      title: 'X Reply',
      description: 'Reply to an existing X post (Pro tier). confirm=true to publish.',
      inputSchema: XReplyInputShape,
    },
    async (input: unknown) => xReplyTool(input),
  );
  server.registerTool(
    'x_quote_tweet',
    {
      title: 'X Quote Tweet',
      description: 'Quote-tweet an existing X post (Pro tier). confirm=true to publish.',
      inputSchema: XQuoteTweetInputShape,
    },
    async (input: unknown) => xQuoteTweetTool(input),
  );
  server.registerTool(
    'x_like_unlike',
    {
      title: 'X Like/Unlike',
      description: 'Like or unlike an X post (Pro tier).',
      inputSchema: XLikeUnlikeInputShape,
    },
    async (input: unknown) => xLikeUnlike(input),
  );
  server.registerTool(
    'x_follow_unfollow',
    {
      title: 'X Follow/Unfollow',
      description:
        'Follow or unfollow an X user (Pro tier). High ban-risk — quiet hours enforced.',
      inputSchema: XFollowUnfollowInputShape,
    },
    async (input: unknown) => xFollowUnfollow(input),
  );
  server.registerTool(
    'x_send_dm',
    {
      title: 'X Send DM',
      description:
        'Send a DM to an X user (Agency tier). Requires Basic+ OAuth. confirm=true required.',
      inputSchema: XSendDmInputShape,
    },
    async (input: unknown) => xSendDmTool(input),
  );
}
