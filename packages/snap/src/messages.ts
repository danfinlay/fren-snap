import { panel, text } from '@metamask/snaps-ui';

const messages = {
  SET_CONFIG: (origin: string) =>
    panel([
      text(
        `The site at **${origin}** wants to provide you with an AI provider.`,
      ),
      text(
        'This provider will be trusted to provide you with AI services, and will have access to any information you grant to your AI agent.',
      ),
    ]),

  AI_PERMISSION: (origin: string) =>
    panel([
      text(`The site at **${origin}** wants to use your AI provider.`),
      text(
        'This provider will be trusted to interact with your AI agent, and will have access to any information you grant to your AI agent.',
      ),
      text('This may also incur charges related to your AI service provider.'),
      text('Do you want to allow this site to use your AI provider?'),
    ]),
};

export { messages };
