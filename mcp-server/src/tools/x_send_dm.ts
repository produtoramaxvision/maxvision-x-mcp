import { z } from 'zod';
import { withInstrumentation, type McpToolResult } from './_base.js';
import { XSendDmInput } from './schemas.js';
import { xSendDm } from '../x-api/client.js';
import { db } from '../db/client.js';
import { engagements } from '../db/schema.js';
import { isQuietHours } from '../browser/anti-detect.js';
import { AppError } from '../errors.js';

const tool = withInstrumentation<z.infer<typeof XSendDmInput>, unknown>({
  name: 'x_send_dm',
  description:
    'Send a DM to an X user (Layer B, Agency tier). Requires Basic+ OAuth scope. confirm=true required.',
  inputSchema: XSendDmInput,
  async handler({ input, accountId }) {
    if (!input.confirm) {
      return {
        preview: true,
        recipientId: input.recipientId,
        text: input.text,
        charCount: input.text.length,
        note: 'Set confirm=true to send the DM.',
      };
    }
    if (isQuietHours()) {
      throw new AppError(
        'TOS_VIOLATION',
        'DM blocked during quiet hours (22:00–06:00 server local).',
      );
    }
    const result = await xSendDm({
      accountId,
      recipientId: input.recipientId,
      text: input.text,
    });
    void db
      .insert(engagements)
      .values({
        accountId,
        action: 'dm',
        targetUserId: input.recipientId,
        payload: { text: input.text },
        success: true,
      })
      .catch(() => {});
    return {
      sent: true,
      recipientId: input.recipientId,
      conversationId: result.data.dm_conversation_id,
      eventId: result.data.dm_event_id,
    };
  },
});

export async function xSendDmTool(input: unknown): Promise<McpToolResult> {
  return tool(input);
}
