import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { assert, object, string, optional } from 'superstruct';
import { z } from 'zod';
import { messages } from './messages';
import SnapMap from './SnapMap';

const ConfigurationParameters = object({
  type: string(),
  apiKey: string(),
  organization: optional(string()),
  username: optional(string()),
  password: optional(string()),
  accessToken: optional(string()),
  basePath: optional(string()),
  baseOptions: optional(string()),
});

const Chat = z.array(
  z.object({
    role: z.string(),
    content: z.string(),
  }),
);

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
  let response;
  let chat;

  switch (request.method) {
    case 'set_config':
      assert(request.params, ConfigurationParameters);
      approved = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: messages.SET_CONFIG(origin),
        },
      });

      if (!approved) {
        throw new Error('User rejected request.');
      }

      await SnapMap.setItem('config', request.params);
      return true;

    case 'ai_permission':
      config = await SnapMap.getItem('config');
      if (!config) {
        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              text(`The site at **${origin}** is requesting an AI provider.`),
              text(
                `Unfortunately, you don't have one currently. You'll need to get one!`,
              ),
            ]),
          },
        });

        throw new Error('No AI provider set.');
      }

      approved = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: messages.AI_PERMISSION(origin),
        },
      });

      if (!approved) {
        throw new Error('User rejected request.');
      }
      await SnapMap.setItem(`ai_permission:${origin}`, true);
      return true;

    case 'ai_request':
      config = await SnapMap.getItem('config');
      assert(config, ConfigurationParameters);
      if (!config) {
        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              text(`The site at **${origin}** is requesting an AI provider.`),
              text(
                `Unfortunately, you don't have one currently. You'll need to get one!`,
              ),
            ]),
          },
        });
        throw new Error('No AI provider set.');
      }

      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }

      console.log('requesting');
      if (!('chat' in request.params)) {
        throw new Error('Invalid request.');
      }

      console.log('parsing', request.params.chat);
      chat = Chat.safeParse(request.params.chat);
      if (!chat.success) {
        throw new Error('Invalid chat request.');
      }
      response = await requestChat(config.apiKey, chat?.data || []);
      console.dir({ response });
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

/**
 * Request a chat from the OpenAI API.
 *
 * @param apiKey - The API key to use.
 * @param messages - The messages to send to the API.
 * @param chatMessages
 */
async function requestChat(
  apiKey: string,
  chatMessages: { role: string; content: string }[],
): Promise<unknown> {
  console.log('requesting chat', chatMessages);
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: chatMessages,
    }),
  })
    .then((response) => response.json())
    .then((data) => data.choices[0].message)
    .catch((error) => console.error(error));
}
