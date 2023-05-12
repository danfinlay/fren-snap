import { useContext, useState } from 'react';
import { ReactReplView } from 'awesome-react-repl';
import { z } from 'zod';
import styled from 'styled-components';
import { IChatMessage } from '../../../../scripts/types';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  requestAIPermission,
  offerAIConfig,
  sendAIPrompt,
  loadDocumentIntoEmbeddings,
  informedQuery,
  shouldDisplayReconnectButton,
  clearEmbeddings,
} from '../utils';
import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  FormCard,
  Card,
} from '../components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
  > img {
    display: block;
    max-width: 400px;
  }
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const TerminalContainer = styled.div`
  display: flex;
  width: 100%; /* set the width of the parent element */

  & > * {
    background-color: rgb(51, 51, 51);
    border-radius: 4px;
    box-shadow: rgba(0, 0, 0, 0.5) 0px 2px 2px 0px;
    color: rgb(255, 255, 255);
    font-family: monospace;
    font-size: 16px;
    font-weight: 700;
    overflow-x: hidden;
    overflow-y: hidden;
    transition: background-color 0.1s linear;

    /* Add this to make the terminal take the full width of its parent */
    flex-grow: 1;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error.muted};
  border: 1px solid ${({ theme }) => theme.colors.error.default};
  color: ${({ theme }) => theme.colors.error.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const ConfigForm = (props: { handleOfferAIConfig: any }) => {
  const { handleOfferAIConfig } = props;
  const [config, setConfig] = useState(
    JSON.stringify({ type: 'openai', apiKey: '<your api key>' }),
  );

  const content = {
    description:
      'Load AI provider into your wallet: Fill in this configuration text. By default you can just fill in an OpenAI API key, but other providers have formats that may work here.',
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    console.log('submitting', config);
    const res = await handleOfferAIConfig(config);
    console.log('res is', res);
    setConfig('Loaded!');
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard content={content}>
        <textarea
          value={config}
          onChange={(event) => {
            console.log('updating config to ', event.target.value);
            setConfig(event.target.value);
          }}
          rows={5}
          style={{ width: '100%', resize: 'none' }}
        />
        <button type="submit" style={{ marginTop: '1rem' }}>
          Submit
        </button>
      </FormCard>
    </form>
  );
};

const EmbeddingLoadingForm = (props: { handleOfferDoc: any }) => {
  const { handleOfferDoc } = props;
  const [config, setConfig] = useState('');

  const content = {
    description:
      'Load an additional document to help your Fren answer your questions with more context!',
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    console.log('submitting', config);
    const res = await handleOfferDoc(config);
    console.log('res is', res);
    setConfig('Loaded!');
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard content={content}>
        <textarea
          value={config}
          onChange={(event) => {
            setConfig(event.target.value);
          }}
          rows={5}
          style={{ width: '100%', resize: 'none' }}
        />
        <button type="submit" style={{ marginTop: '1rem' }}>
          Submit
        </button>
      </FormCard>
    </form>
  );
};

type Line = {
  type: 'input' | 'output';
  value: string;
};
type Lines = Line[];
const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);
  const [lines, setLines] = useState<Lines>([]);
  const [informedLines, setInformedLines] = useState<Lines>([]);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleOfferDoc = async (doc: string) => {
    try {
      return await loadDocumentIntoEmbeddings(doc);
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleOfferAIConfig = async (config: string) => {
    try {
      return await offerAIConfig(config);
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>Fren</Span>
        <img
          src="http://danfinlay.com/fren/splash.png"
          width="100%"
          height="100%"
          alt="Fren"
        />
      </Heading>
      <Subtitle>
        Fren is your personal AI assistant that you can take around the web, who
        lives in your wallet.
      </Subtitle>
      <CardContainer>
        {state.error && (
          <ErrorMessage>
            <b>An error happened:</b> {state.error.message}
          </ErrorMessage>
        )}
        {!state.isFlask && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!state.installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={handleConnectClick}
                  disabled={!state.isFlask}
                />
              ),
            }}
            disabled={!state.isFlask}
          />
        )}
        {shouldDisplayReconnectButton(state.installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={handleConnectClick}
                  disabled={!state.installedSnap}
                />
              ),
            }}
            disabled={!state.installedSnap}
          />
        )}

        <ConfigForm handleOfferAIConfig={handleOfferAIConfig} />

        <Card
          content={{
            title: 'Request AI permission',
            description: 'Request permission to use your AI API.',
            button: (
              <button
                onClick={requestAIPermission}
                disabled={!state.installedSnap}
              >
                Request
              </button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />

        {state.installedSnap && (
          <TerminalContainer>
            <ReactReplView
              title="Your AI Chat"
              width="100%"
              height={300}
              lines={lines}
              onSubmit={(userInput: string) => {
                setLines((prevLines: any) => [
                  ...prevLines,
                  {
                    type: 'input',
                    value: userInput,
                  },
                ]);

                const chatMessages: IChatMessage[] = [
                  {
                    role: 'user',
                    content: userInput,
                  },
                ];
                lines.forEach((line) => {
                  chatMessages.push({
                    role: line.type === 'input' ? 'user' : 'assistant',
                    content: line.value,
                  });
                });

                sendAIPrompt(chatMessages)
                  .then((result: IChatMessage) => {
                    const ChatM = z.object({
                      role: z.string(),
                      content: z.string(),
                    });
                    ChatM.parse(result);
                    console.dir({ result });
                    setLines((prevLines: Line[]) => {
                      const newLine: Line = {
                        type: 'output',
                        value: result.content,
                      };
                      const newLines: Line[] = [...prevLines, newLine];
                      return newLines;
                    });
                  })
                  .catch((e: { message: any }) => {
                    setLines((prevLines: any) => [
                      ...prevLines,
                      {
                        type: 'output',
                        value: `Error: ${e.message}`,
                      },
                    ]);
                    console.error(e);
                    return e.message;
                  });
              }}
            />
          </TerminalContainer>
        )}

        <EmbeddingLoadingForm handleOfferDoc={handleOfferDoc} />

        {state.installedSnap && (
          <TerminalContainer>
            <ReactReplView
              title="Informed AI Chat"
              width="100%"
              height={300}
              lines={informedLines}
              onSubmit={(userInput: string) => {
                setInformedLines((prevLines: any) => [
                  ...prevLines,
                  {
                    type: 'input',
                    value: userInput,
                  },
                ]);

                const chatMessages: IChatMessage[] = [
                  {
                    role: 'user',
                    content: userInput,
                  },
                ];
                informedLines.forEach((line) => {
                  chatMessages.push({
                    role: line.type === 'input' ? 'user' : 'assistant',
                    content: line.value,
                  });
                });

                informedQuery(chatMessages)
                  .then((result: IChatMessage) => {
                    const ChatM = z.object({
                      role: z.string(),
                      content: z.string(),
                    });
                    ChatM.parse(result);
                    console.dir({ result });
                    setInformedLines((prevLines: Line[]) => {
                      const newLine: Line = {
                        type: 'output',
                        value: result.content,
                      };
                      const newLines: Line[] = [...prevLines, newLine];
                      return newLines;
                    });
                  })
                  .catch((e: { message: any }) => {
                    setInformedLines((prevLines: any) => [
                      ...prevLines,
                      {
                        type: 'output',
                        value: `Error: ${e.message}`,
                      },
                    ]);
                    console.error(e);
                    return e.message;
                  });
              }}
            />
          </TerminalContainer>
        )}

        <Card
          content={{
            title: 'Advanced: Clear embeddings',
            description: 'To reset the presentation',
            button: (
              <button
                onClick={() => {
                  clearEmbeddings().then(console.log).catch(console.error);
                }}
                disabled={!state.installedSnap}
              >
                Clear
              </button>
            ),
          }}
          disabled={!state.installedSnap}
          fullWidth={
            state.isFlask &&
            Boolean(state.installedSnap) &&
            !shouldDisplayReconnectButton(state.installedSnap)
          }
        />
      </CardContainer>
    </Container>
  );
};

export default Index;
