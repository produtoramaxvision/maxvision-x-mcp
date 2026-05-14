import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XFollowUnfollowInput } from './schemas.js';
import { xFollow, xApiRequest } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';

const tool = withInstrumentation<z.infer<typeof XFollowUnfollowInput>, unknown>({
  name: 'x_follow_unfollow',
  description:
    'Follow or unfollow an X user (Layer B, Pro tier). High ban-risk — apply quiet hours.',
  inputSchema: XFollowUnfollowInput,
  async handler({ input, accountId }) {
    const me = await xApiRequest<{ data: { id: string } }>('/users/me', {
      accountId,
    });
    const result = await xFollow({
      accountId,
      userId: me.data.id,
      targetUserId: input.targetUserId,
      unfollow: input.unfollow,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: input.unfollow ? 'unfollow' : 'follow',
        targetUserId: input.targetUserId,
        success: true,
      })
      .catch(() => {});
    return { targetUserId: input.targetUserId, following: !input.unfollow, raw: result };
  },
});

export async function xFollowUnfollow(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
