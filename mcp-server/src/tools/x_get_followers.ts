import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetFollowersInput } from './schemas.js';
import { xGetFollowers } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetFollowersInput>, unknown>({
  name: 'x_get_followers',
  description: 'List followers of an X user (Layer B X API v2). Pro tier.',
  inputSchema: XGetFollowersInput,
  async handler({ input }) {
    return xGetFollowers(input.userId, input.maxResults);
  },
});

export async function xGetFollowersTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
