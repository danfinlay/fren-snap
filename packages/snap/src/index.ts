import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import SnapMap from './SnapMap';

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
  switch (request.method) {
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
