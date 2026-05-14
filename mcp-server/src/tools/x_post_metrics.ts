import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XPostMetricsInput } from './schemas.js';
import { xApiRequest, type XPost } from '../x-api/client.js';

const tool = withInstrumentation<z.infer<typeof XPostMetricsInput>, unknown>({
  name: 'x_post_metrics',
  description:
    'Fetch public + non_public metrics for an owned X post (Layer B). Non-public available only for posts authored by the authenticated account.',
  inputSchema: XPostMetricsInput,
  async handler({ input }) {
    return xApiRequest<{ data: XPost }>(`/tweets/${input.postId}`, {
      query: {
        'tweet.fields':
          'public_metrics,non_public_metrics,organic_metrics,promoted_metrics,created_at,author_id',
      },
    });
  },
});

export async function xPostMetrics(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
