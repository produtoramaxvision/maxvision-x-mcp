import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XProfileActivityInput } from './schemas.js';
import { xSearch } from '../grok/client.js';

const tool = withInstrumentation<z.infer<typeof XProfileActivityInput>, unknown>({
  name: 'x_profile_activity',
  description:
    'Get recent activity for an X handle via Grok x_search filter (Layer A). Returns warm-lead signals.',
  inputSchema: XProfileActivityInput,
  async handler({ input }) {
    const result = await xSearch({
      query: `Recent activity from @${input.handle} — what are they posting/discussing?`,
      allowedHandles: [`@${input.handle}`],
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    return {
      handle: input.handle,
      grokResponse: result.text,
      toolCalls: result.toolCalls ?? [],
    };
  },
});

export async function xProfileActivity(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
