import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetFollowingInput } from './schemas.js';
import { xGetFollowing } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetFollowingInput>, unknown>({
  name: 'x_get_following',
  description: 'List accounts an X user is following (Layer B X API v2). Pro tier.',
  inputSchema: XGetFollowingInput,
  async handler({ input }) {
    return xGetFollowing(input.userId, input.maxResults);
  },
});

export async function xGetFollowingTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
