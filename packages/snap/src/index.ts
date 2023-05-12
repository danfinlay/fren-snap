import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { z } from 'zod';
import {
  IChatMessage,
  ChatMessage,
  ConfigurationParameters,
  Chat,
  AiRequestMetaZod,
  AiRequestMeta,
  LoadDocumentIntoEmbeddingsParameters,
} from '../../../scripts/types';
import { messages } from './messages';
import SnapMap from './SnapMap';

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
  ConfigurationParameters.parse(config);
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
    case 'clear_embeddings':
      // Just hacky, clear the embeddingsIndex:
      await SnapMap.setItem('embeddingsIndex', {});
      return true;
    case 'set_config':
      ConfigurationParameters.parse(request.params);
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
      console.log('parsing', request.params);
      try {
        LoadDocumentIntoEmbeddingsParameters.parse(request);
      } catch (err) {
        console.error(err);
        throw new Error('Invalid request.');
      }

      // Get the current configuration
      console.log('getting config');
      config = await SnapMap.getItem('config');
      ConfigurationParameters.parse(config);
      if (!config) {
        throw new Error('No AI provider set.');
      }

      // Check if the origin has permission to load documents
      console.log('checking permissions');
      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }

      // Load the document into the embeddings database
      console.log('loading document');
      await loadDocumentIntoEmbeddings(config.apiKey, request.params.doc);

      return 'success!';

    case 'informed_query':
      if (!request.params || typeof request.params !== 'object') {
        throw new Error('Invalid request.');
      }

      try {
        Chat.parse(request.params?.chat);
      } catch (err) {
        console.error(err);
        throw new Error('Invalid request.');
      }

      // Get the current configuration
      console.log('loading config');
      config = await SnapMap.getItem('config');
      ConfigurationParameters.parse(config);
      if (!config) {
        throw new Error('No AI provider set.');
      }

      // Check if the origin has permission to load documents
      console.log('checking permission');
      approved = await SnapMap.getItem(`ai_permission:${origin}`);
      if (!approved) {
        throw new Error('Unauthorized request.');
      }

      // Make an informed query to the AI
      console.log('making query');
      return informedQuery(config.apiKey, request.params.chat);

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
  chatMessages: IChatMessage[],
): Promise<IChatMessage> {
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
    .then((data) => {
      console.log('server returned', data);
      console.log('we are returning', data.choices[0].message);
      const { message } = data.choices[0];
      ChatMessage.parse(message);
      return message;
    })
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
): Promise<boolean> {
  // Get the document's embedding
  const embedding = await requestEmbeddings(apiKey, document);

  // Get the current embeddingsIndex from the SnapMap (or an empty object if it doesn't exist)
  const embeddingsIndex = (await SnapMap.getItem('embeddingsIndex')) || {};
  console.log(
    'seeking document with closest relevance out of ',
    Object.keys(embeddingsIndex).length,
  );
  const safeIndex = EmbeddingsIndex.safeParse(embeddingsIndex);
  if (!safeIndex.success) {
    throw new Error('Invalid embeddings index.');
  }

  // Update the embeddingsIndex
  const index = safeIndex.data;
  console.log('setting old embedding');
  Embedding.parse(embedding);
  index[document] = embedding;

  await SnapMap.setItem('embeddingsIndex', index);
  return true;
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
        console.log('returning embedding', data.data[0].embedding);
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
  console.log({ embedding1, embedding2 });
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
async function informedQuery(
  apiKey: string,
  query: IChatMessage[],
): Promise<unknown> {
  // Get the query's embedding
  const queryEmbedding = await requestEmbeddings(
    apiKey,
    query[query.length - 1].content,
  );
  console.log('query embedding', queryEmbedding);

  console.log('loading embeddings index');
  // Get the current embeddings index from the SnapMap (or an empty object if it doesn't exist)
  const embeddingsIndex = (await SnapMap.getItem('embeddingsIndex')) || {};
  const safeIndex = EmbeddingsIndex.safeParse(embeddingsIndex);
  if (!safeIndex.success || typeof safeIndex.data !== 'object') {
    throw new Error('Invalid embeddings index.');
  }

  console.log('calculating distances');
  // Calculate the distance between the query's embedding and each document's embedding
  const distances: Record<string, number> = {};
  console.log('iterating over documents', safeIndex.data);

  Object.keys(safeIndex.data).forEach((document) => {
    const documentEmbedding = safeIndex.data[document];
    distances[document] = distance(queryEmbedding, documentEmbedding);
  });

  console.log('finding closest document');
  // Find the document that is the closest to the query
  const closestDocument = keyOfMinValue(distances);
  if (!closestDocument || typeof closestDocument !== 'string') {
    console.log('no closest doc found');
    return requestChat(apiKey, query);
  }

  console.log(
    'enhancing the query with this closest document: ',
    closestDocument,
  );

  const latest: IChatMessage | undefined = query.pop();
  if (!latest) {
    throw new Error("Couldn't find the latest message in the query.");
  }

  // Call requestChat with the user's query as the last message and the closest document as the first one
  return requestChat(apiKey, [
    ...query,
    { role: 'system', content: closestDocument },
    latest,
  ]);
}
