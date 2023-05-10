import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { Configuration, OpenAIApi } from 'openai';
import { assert, object, string, optional } from 'superstruct';
import { messages } from './messages';
import SnapMap from './SnapMap';

const ConfigurationParameters = object({
  apiKey: string(),
  organization: optional(string()),
  username: optional(string()),
  password: optional(string()),
  accessToken: optional(string()),
  basePath: optional(string()),
  baseOptions: optional(string()),
});

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  let times;
  let approved;
  let config;
  let openai, response;

  switch (request.method) {
    case 'set_config':
      approved = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: messages.SET_CONFIG,
        },
      });

      if (!approved) {
        throw new Error('User rejected request.');
      }

      assert(request.params, ConfigurationParameters);
      await SnapMap.setItem('config', request.params);
      return true;

    case 'ai_permission':
      approved = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: messages.AI_PERMISSION,
        },
      });

      if (!approved) {
        throw new Error('User rejected request.');
      }
      await SnapMap.setItem(`ai_permission:${origin}`, true);
      return true;

    case 'ai_request':
      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }
      config = await SnapMap.getItem('config');
      if (!config) {
        throw new Error('No AI provider set.');
      }

      openai = await requestOpenAI(origin);
      response = Object.keys(openai);

      return response;

    case 'hello':
      times = await getTimes();
      SnapMap.setItem('hello', times + 1);
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`Hello, **${origin}**!`),
            text('This custom confirmation is just for display purposes.'),
            text(`You've said hello ${times} times.`),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    default:
      throw new Error('Method not found.');
  }
};

/**
 * Request the OpenAI API.
 *
 * @param origin - The origin of the request
 */
async function requestOpenAI(origin: string): Promise<OpenAIApi> {
  const approved = await SnapMap.getItem(`ai_permission:${origin}`);
  if (!approved) {
    throw new Error('Unauthorized request.');
  }
  const config = await SnapMap.getItem('config');
  assert(config, ConfigurationParameters);

  if (!config) {
    throw new Error('No AI provider set.');
  }

  const configuration = new Configuration(config);
  const openai = new OpenAIApi(configuration);
  return openai;
}

/**
 * Get the number of times the user has said hello.
 *
 * @returns The number of times the user has said hello.
 */
async function getTimes(): Promise<number> {
  const times = (await SnapMap.getItem('hello')) || 0;
  if (typeof times === 'number') {
    return times;
  }

  return 0;
}
