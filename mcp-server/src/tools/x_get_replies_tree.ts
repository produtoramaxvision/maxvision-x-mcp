import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetRepliesTreeInput } from './schemas.js';
import { apifyConversationThread } from '../scrapers/apify-x.js';

const tool = withInstrumentation<z.infer<typeof XGetRepliesTreeInput>, unknown>({
  name: 'x_get_replies_tree',
  description:
    'Fetch full replies tree of an X conversation via Apify (Layer C). Pro tier.',
  inputSchema: XGetRepliesTreeInput,
  async handler({ input }) {
    const items = await apifyConversationThread({
      conversationId: input.conversationId,
      maxItems: input.maxResults,
    });
    return { conversationId: input.conversationId, items };
  },
});

export async function xGetRepliesTreeTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
