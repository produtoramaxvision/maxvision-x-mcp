import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XLikeUnlikeInput } from './schemas.js';
import { xLike, xApiRequest } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';

const tool = withInstrumentation<z.infer<typeof XLikeUnlikeInput>, unknown>({
  name: 'x_like_unlike',
  description: 'Like or unlike an X post (Layer B, Pro tier).',
  inputSchema: XLikeUnlikeInput,
  async handler({ input, accountId }) {
    // Need authed user id — fetch via /users/me
    const me = await xApiRequest<{ data: { id: string } }>('/users/me', {
      accountId,
    });
    const result = await xLike({
      accountId,
      userId: me.data.id,
      tweetId: input.tweetId,
      unlike: input.unlike,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: input.unlike ? 'unlike' : 'like',
        targetPostId: input.tweetId,
        success: true,
      })
      .catch(() => {});
    return { tweetId: input.tweetId, liked: !input.unlike, raw: result };
  },
});

export async function xLikeUnlike(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
