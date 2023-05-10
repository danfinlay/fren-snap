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

export const offerAIConfig = async (config) => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'set_config', params: config },
    },
  });
};

export const sendAIPrompt = async (prompt) => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'ai_request', params: prompt },
    },
  });
};
