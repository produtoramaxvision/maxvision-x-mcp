import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetRepliesTreeInput } from './schemas.js';
import { xSearchConversation } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetRepliesTreeInput>, unknown>({
  name: 'x_get_replies_tree',
  description:
    'Fetch replies tree of an X conversation via X API v2 search (Layer B). Pro tier.',
  inputSchema: XGetRepliesTreeInput,
  async handler({ input }) {
    const result = await xSearchConversation(input.conversationId, input.maxResults);
    const items = result.data ?? [];
    return {
      conversationId: input.conversationId,
      count: items.length,
      items,
      meta: result.meta,
    };
  },
});

export async function xGetRepliesTreeTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
