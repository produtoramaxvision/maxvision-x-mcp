import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XGetPostInput } from './schemas.js';
import { xGetPost } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XGetPostInput>, unknown>({
  name: 'x_get_post',
  description: 'Fetch a single X post by ID via X API v2 (Layer B). Cached.',
  inputSchema: XGetPostInput,
  async handler({ input }) {
    return xGetPost(input.postId);
  },
});

export async function xGetPostTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
