import { z } from 'zod';
import { defaultSnapOrigin } from '../config';
import {
  IChatMessage,
  ChatMessage,
  ConfigurationParameters,
  Chat,
} from '../../../../scripts/types';

/**
 * Invoke the "hello" method from the example snap.
 */

export const requestAIPermission = async () => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: { snapId: defaultSnapOrigin, request: { method: 'ai_permission' } },
  });
};

export const clearEmbeddings = async () => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'clear_embeddings' },
    },
  });
};

export const offerAIConfig = async (config: string) => {
  console.log('offering config', config);
  console.log(typeof config);
  const parsed = JSON.parse(config);
  ConfigurationParameters.parse(parsed);
  console.log(parsed);

  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'set_config', params: { ...parsed } },
    },
  });
};

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

  const chat = ChatMessage.safeParse(result);
  console.log('parsing result', chat);
  if (
    !chat.success ||
    !chat.data ||
    !['user', 'assistant', 'system'].includes(chat.data.role)
  ) {
    throw new Error('Invalid chat response');
  }
  const safeChat: IChatMessage = chat.data;
  return safeChat;
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
): Promise<boolean> => {
  const res = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'load_document_into_embeddings',
        params: { doc: document },
      },
    },
  });

  return Boolean(res);
};

export const informedQuery = async (
  prompt: IChatMessage[],
): Promise<IChatMessage> => {
  const result = await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'informed_query',
        params: {
          chat: prompt,
        },
      },
    },
  });

  const chat = ChatMessage.safeParse(result);
  if (!chat.success) {
    throw new Error('Invalid chat response');
  }

  return chat.data;
};
