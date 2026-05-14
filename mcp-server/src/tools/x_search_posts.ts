import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XSearchPostsInput, XSearchPostsInputShape } from './schemas.js';
import { xSearch } from '../grok/client.js';

const tool = withInstrumentation<z.infer<typeof XSearchPostsInput>, unknown>({
  name: 'x_search_posts',
  description:
    'Search X posts via xAI Grok x_search (Layer A). Returns Grok response with tool_calls.',
  inputSchema: XSearchPostsInput,
  async handler({ input }) {
    const result = await xSearch({
      query: input.query,
      allowedHandles: input.allowedHandles,
      excludedHandles: input.excludedHandles,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    return {
      query: input.query,
      maxResults: input.maxResults,
      grokResponse: result.text,
      toolCalls: result.toolCalls ?? [],
    };
  },
});

export async function xSearchPosts(input: unknown): Promise<McpToolResult> {
  return tool(input);
}

export { XSearchPostsInputShape };
