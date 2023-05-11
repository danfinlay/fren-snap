import { Json } from '@metamask/snaps-types';
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

type ChatMessage = {
  role: string;
  content: string;
};

export const sendAIPrompt = async (prompt: ChatMessage[]) => {
  console.dir({ prompt });
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'ai_request', params: { chat: prompt } },
    },
  });
};
