/** How to interact with the Fren AI Snap, as found at fren.cc
 * You can find these docs at https://github.com/danfinlay/fren-snap/blob/main/packages/site/src/utils/ai.ts
 * This API is available to websites and other MetaMask snaps for whom Fren is installed.
 */

import { z } from 'zod';
import { defaultSnapOrigin } from '../config';
import {
  IChatMessage,
  ChatMessage,
  ConfigurationParameters,
  Chat,
} from '../../../../scripts/types';

/**
 * type IChatMessage = {
 * role: string;
 * content: string;
 * };
 */

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

/**
 * Returns a chat response from the AI.
 * @param prompt - The chat history for the AI to respond to.
 * @returns The response from the AI. 
 */
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

/**
 * Returns an embeddings array for a given input string.
 *
 * @param input - The input string to get an embedding for.
 * @returns An array of embeddings.
 */
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

/**
 * Loads a document into the user's embeddings index, which is incorporated into
 * queries to `informedQuery`.
 *
 * @param document - The document to load into the embeddings index.
 * @returns True if the document was loaded successfully, false otherwise.
 */
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

/**
 * Asks Fren to provide a response to a given prompt,
 * while incorporating the most relevant document from the user's embeddings index.
 * @param prompt - The prompt to send to the AI.
 * @returns The response from the AI.
 */
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
