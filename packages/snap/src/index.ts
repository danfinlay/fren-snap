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

type AiRequestMeta = {
  method: 'chat' | 'embeddings' | 'completions' | 'edits';
  [key: string]: any;
};
const AiRequestMetaZod = z.object({
  method: z.string(),
});

/**
 * Handle an AI request from the snap.
 *
 * @param meta - The request meta object.
 * @param origin - The origin of the request.
 * @param params - The request params.
 * @returns The response from the AI provider.
 */
async function handleAiRequest(
  meta: AiRequestMeta,
  origin: string,
  params: any,
): Promise<unknown> {
  // common code for all methods
  const config = await SnapMap.getItem('config');
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

  const approved = await SnapMap.getItem(`ai_permission:${origin}`);
  if (!approved) {
    throw new Error('Unauthorized request.');
  }

  let chat, response;

  // switch based on the method in the meta object
  switch (meta.method) {
    case 'chat':
      console.log('requesting');
      if (!('chat' in params)) {
        throw new Error('Invalid request.');
      }

      console.log('parsing', params.chat);
      chat = Chat.safeParse(params.chat);
      if (!chat.success) {
        throw new Error('Invalid chat request.');
      }
      response = await requestChat(config.apiKey, chat?.data || []);
      console.dir({ response });
      return response;

    case 'embeddings':
      console.log('requesting');
      if (!('embeddings' in params) || typeof params.embeddings !== 'string') {
        throw new Error('Invalid request.');
      }

      response = await requestEmbeddings(config.apiKey, params.embeddings);
      console.dir({ response });
      return response;

    case 'completions':
      throw new Error('Not implemented.');

    case 'edits':
      throw new Error('Not implemented.');

    default:
      throw new Error('Invalid AI request method.');
  }
}

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
  let approved;
  let config;

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
      AiRequestMetaZod.parse(request.params);
      return handleAiRequest(request.params, origin, request.params);

    case 'load_document_into_embeddings':
      z.object({ params: z.object({ doc: z.string() }) }).parse(request.params);

      // Get the current configuration
      config = await SnapMap.getItem('config');
      assert(config, ConfigurationParameters);
      if (!config) {
        throw new Error('No AI provider set.');
      }

      // Check if the origin has permission to load documents
      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }

      // Load the document into the embeddings database
      await loadDocumentIntoEmbeddings(config.apiKey, request.params.doc);

      return true;

    case 'informed_query':
      if (!request.params || typeof request.params !== 'string') {
        throw new Error('Invalid request.');
      }

      // Get the current configuration
      config = await SnapMap.getItem('config');
      assert(config, ConfigurationParameters);
      if (!config) {
        throw new Error('No AI provider set.');
      }

      // Check if the origin has permission to load documents
      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }

      // Make an informed query to the AI
      return informedQuery(config.apiKey, request.params.query);

    default:
      throw new Error('Method not found.');
  }
};

/**
 * Request a chat from the OpenAI API.
 *
 * @param apiKey - The API key to use.
 * @param chatMessages - The messages to send to the API.
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

const Embedding = z.array(z.number());
const EmbeddingsIndex = z.record(Embedding);

/**
 * Load a document into the local embeddings database.
 *
 * @param apiKey - The API key to use.
 * @param document - The document to load.
 */
async function loadDocumentIntoEmbeddings(
  apiKey: string,
  document: string,
): Promise<void> {
  // Get the document's embedding
  const embedding = await requestEmbeddings(apiKey, document);

  // Get the current embeddingsIndex from the SnapMap (or an empty object if it doesn't exist)
  const embeddingsIndex = (await SnapMap.getItem('embeddingsIndex')) || {};
  const safeIndex = EmbeddingsIndex.safeParse(embeddingsIndex);
  if (!safeIndex.success || !Array.isArray(safeIndex.data)) {
    throw new Error('Invalid embeddings index.');
  }

  // Update the embeddingsIndex
  const index = safeIndex.data;
  Embedding.parse(embedding);
  index[document] = embedding;

  await SnapMap.setItem('embeddingsIndex', embeddingsIndex);
}

/**
 * Request an embedding from the OpenAI API.
 *
 * @param apiKey - The API key to use.
 * @param input - The input string for which to get an embedding.
 */
async function requestEmbeddings(
  apiKey: string,
  input: string,
): Promise<number[]> {
  console.log('requesting embeddings', input);
  return fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input,
      model: 'text-embedding-ada-002',
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.data && data.data.length > 0) {
        return data.data[0].embedding;
      }
      throw new Error('Invalid response from embeddings API.');
    })
    .catch((error) => console.error(error));
}

/**
 * Calculate the distance between two embeddings.
 *
 * @param embedding1 - The first embedding.
 * @param embedding2 - The second embedding.
 * @returns The distance between the two embeddings.
 */
function distance(embedding1: number[], embedding2: number[]): number {
  // TODO: Replace this with the actual implementation of your distance metric
  return Math.sqrt(
    embedding1.reduce(
      (sum, value, index) => sum + Math.pow(value - embedding2[index], 2),
      0,
    ),
  );
}

/**
 * Find the key with the minimum value in an object.
 *
 * @param obj - The object to search.
 * @returns The key with the minimum value.
 */
function keyOfMinValue(obj: Record<string, number>): string | null {
  let minKey = null;
  let minValue = Infinity;

  for (const key in obj) {
    if (obj[key] < minValue) {
      minKey = key;
      minValue = obj[key];
    }
  }

  return minKey;
}

/**
 * Make an informed query to the AI.
 *
 * @param apiKey - The API key to use.
 * @param query - The query to send.
 * @returns The response from the AI.
 */
async function informedQuery(apiKey: string, query: string): Promise<unknown> {
  // Get the query's embedding
  const queryEmbedding = await requestEmbeddings(apiKey, query);

  // Get the current embeddings index from the SnapMap (or an empty object if it doesn't exist)
  const embeddingsIndex = (await SnapMap.getItem('embeddingsIndex')) || {};
  const safeIndex = EmbeddingsIndex.safeParse(embeddingsIndex);
  if (!safeIndex.success || typeof safeIndex.data !== 'object') {
    throw new Error('Invalid embeddings index.');
  }

  // Calculate the distance between the query's embedding and each document's embedding
  const distances: Record<string, number> = {};
  for (const document in safeIndex.data) {
    if (Object.prototype.hasOwnProperty.call(safeIndex.data, document)) {
      const documentEmbedding = safeIndex.data[document];
      distances[document] = distance(queryEmbedding, documentEmbedding);
    }
  }

  // Find the document that is the closest to the query
  const closestDocument = keyOfMinValue(distances);
  if (!closestDocument || typeof closestDocument !== 'string') {
    return requestChat(apiKey, [{ role: 'user', content: query }]);
  }

  // Call requestChat with the user's query as the last message and the closest document as the first one
  return requestChat(apiKey, [
    { role: 'system', content: closestDocument },
    { role: 'user', content: query },
  ]);
}
