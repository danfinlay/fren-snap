import { z } from 'zod';
import { IChatMessage } from '../types/custom';
import { defaultSnapOrigin } from '../config';

/**
 * Invoke the "hello" method from the example snap.
 */

export const requestAIPermission = async () => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: { snapId: defaultSnapOrigin, request: { method: 'ai_permission' } },
  });
};

export const offerAIConfig = async (config: string) => {
  console.log('offering config', config);
  console.log(typeof config);
  const parsed = JSON.parse(config);
  console.log(parsed);

  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'set_config', params: { ...parsed } },
    },
  });
};

const Chat = z.object({
  role: z.string(),
  content: z.string(),
});

export const sendAIPrompt = async (
  prompt: IChatMessage[],
): Promise<IChatMessage> => {
  console.dir({ prompt });
  const result = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'ai_request', params: { chat: prompt } },
    },
  });

  const chat = Chat.safeParse(result);
  if (!chat.success) {
    throw new Error('Invalid chat response');
  }

  return chat.data;
};
