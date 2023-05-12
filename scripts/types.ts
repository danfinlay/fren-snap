import { z } from 'zod';

export const AiRequestMetaZod = z.object({
  method: z.string(),
});

// set_config

export const ConfigurationParameters = z.object({
  type: z.string(),
  apiKey: z.string(),
  organization: z.optional(z.string()),
  username: z.optional(z.string()),
  password: z.optional(z.string()),
  accessToken: z.optional(z.string()),
  basePath: z.optional(z.string()),
  baseOptions: z.optional(z.string()),
});

// ai_permission () => boolean;

// load_document_into_embeddings

export const LoadDocumentIntoEmbeddingsParameters = z.object({
  params: z.object({ doc: z.string() }),
});

// informed_query (chat: IChatMessage[]) => IChatMessage;

// ** AI request methods: ai_request

export type AiRequestMeta = {
  method: 'chat' | 'embeddings' | 'completions' | 'edits';
  [key: string]: any;
};

// chat

export const ChatMessage = z.object({
  role: z.string(),
  content: z.string(),
});

export const Chat = z.array(ChatMessage);

export type IChatMessage = {
  role: string;
  content: string;
};

// embeddings: (string) => number[]
