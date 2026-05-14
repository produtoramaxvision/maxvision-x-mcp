import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XQuoteTweetInput } from './schemas.js';
import { xPostTweet } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';

const tool = withInstrumentation<z.infer<typeof XQuoteTweetInput>, unknown>({
  name: 'x_quote_tweet',
  description:
    'Quote-tweet an existing X post (Layer B, Pro tier). confirm=true to publish.',
  inputSchema: XQuoteTweetInput,
  async handler({ input, accountId }) {
    if (!input.confirm) {
      return {
        preview: true,
        quoting: input.quotedTweetId,
        text: input.text,
        charCount: input.text.length,
        note: 'Set confirm=true to publish the quote.',
      };
    }
    const result = await xPostTweet({
      accountId,
      text: input.text,
      quoteId: input.quotedTweetId,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: 'quote',
        targetPostId: input.quotedTweetId,
        payload: { quoteId: result.data.id, text: input.text },
        success: true,
      })
      .catch(() => {});
    return { published: true, quoteId: result.data.id };
  },
});

export async function xQuoteTweetTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
