import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XPostTweetInput } from './schemas.js';
import { xPostTweet } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';

const tool = withInstrumentation<z.infer<typeof XPostTweetInput>, unknown>({
  name: 'x_post_tweet',
  description:
    'Publish a new tweet (Layer B, Pro tier). confirm=true to publish; confirm=false returns preview.',
  inputSchema: XPostTweetInput,
  async handler({ input, accountId }) {
    if (!input.confirm) {
      return {
        preview: true,
        text: input.text,
        charCount: input.text.length,
        mediaCount: input.mediaIds?.length ?? 0,
        note: 'Set confirm=true to publish.',
      };
    }
    const result = await xPostTweet({
      accountId,
      text: input.text,
      mediaIds: input.mediaIds,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: 'post',
        targetPostId: result.data.id,
        payload: { text: input.text },
        success: true,
      })
      .catch(() => {});
    return { published: true, postId: result.data.id, text: result.data.text };
  },
});

export async function xPostTweetTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
