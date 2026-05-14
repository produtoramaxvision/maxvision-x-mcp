import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XReplyInput } from './schemas.js';
import { xPostTweet } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';

const tool = withInstrumentation<z.infer<typeof XReplyInput>, unknown>({
  name: 'x_reply',
  description:
    'Reply to an existing X post (Layer B, Pro tier). confirm=true to publish.',
  inputSchema: XReplyInput,
  async handler({ input, accountId }) {
    if (!input.confirm) {
      return {
        preview: true,
        replyTo: input.inReplyToTweetId,
        text: input.text,
        charCount: input.text.length,
        note: 'Set confirm=true to publish the reply.',
      };
    }
    const result = await xPostTweet({
      accountId,
      text: input.text,
      replyToId: input.inReplyToTweetId,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: 'reply',
        targetPostId: input.inReplyToTweetId,
        payload: { replyId: result.data.id, text: input.text },
        success: true,
      })
      .catch(() => {});
    return {
      published: true,
      replyId: result.data.id,
      inReplyTo: input.inReplyToTweetId,
    };
  },
});

export async function xReplyTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
