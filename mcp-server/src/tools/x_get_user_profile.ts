import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetUserProfileInput } from './schemas.js';
import { xGetUser } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetUserProfileInput>, unknown>({
  name: 'x_get_user_profile',
  description: 'Fetch a public X user profile by username (Layer B X API v2).',
  inputSchema: XGetUserProfileInput,
  async handler({ input }) {
    return xGetUser(input.username);
  },
});

export async function xGetUserProfile(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
