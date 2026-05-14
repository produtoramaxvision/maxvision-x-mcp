import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetUserTimelineInput } from './schemas.js';
import { xGetUserTimeline } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetUserTimelineInput>, unknown>({
  name: 'x_get_user_timeline',
  description: 'Fetch recent posts for an X user by ID (Layer B X API v2).',
  inputSchema: XGetUserTimelineInput,
  async handler({ input }) {
    return xGetUserTimeline(input.userId, input.maxResults);
  },
});

export async function xGetUserTimelineTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
