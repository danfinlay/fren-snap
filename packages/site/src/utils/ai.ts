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
      request: {
        method: 'ai_request',
        params: { method: 'chat', chat: prompt },
      },
    },
  });

  const chat = Chat.safeParse(result);
  if (!chat.success) {
    throw new Error('Invalid chat response');
  }

  return chat.data;
};

export const requestEmbeddings = async (input: string): Promise<number[]> => {
  console.log({ input });
  const result = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'ai_request',
        params: { method: 'embeddings', input },
      },
    },
  });

  if (!Array.isArray(result)) {
    throw new Error('Invalid embeddings response');
  }

  return result;
};

export const loadDocumentIntoEmbeddings = async (
  document: string,
): Promise<void> => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'load_document_into_embeddings',
        params: [document],
      },
    },
  });
};

export const informedQuery = async (
  prompt: IChatMessage[],
): Promise<IChatMessage> => {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'informed_query',
        params: {
          chat,
        },
      },
    },
  });
};
