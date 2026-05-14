import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XSearchUsersInput } from './schemas.js';
import { xSearch } from '../grok/client.js';

const tool = withInstrumentation<z.infer<typeof XSearchUsersInput>, unknown>({
  name: 'x_search_users',
  description:
    'Search X users by keyword/handle via Grok (Layer A). Returns Grok-curated list.',
  inputSchema: XSearchUsersInput,
  async handler({ input }) {
    const result = await xSearch({
      query: `Search X users matching: ${input.query}. Return up to ${input.maxResults} handles + brief profile bios.`,
    });
    return {
      query: input.query,
      grokResponse: result.text,
      toolCalls: result.toolCalls ?? [],
    };
  },
});

export async function xSearchUsers(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
