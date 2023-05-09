/* eslint-disable jsdoc/match-description */
import { Json } from '@metamask/snaps-types';

/**
 * Persists the snap state
 *
 * @param newState - The new state to persist
 * @returns The snap state
 */
async function updateState(newState: Record<string, Json>) {
  await snap.request({
    method: 'snap_manageState',
    params: { operation: 'update', newState },
  });
}

/**
 * Retrieves the snap state
 *
 * @returns The snap state
 */
async function getState(): Promise<Record<string, Json>> {
  const prior = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  });

  if (prior) {
    return prior;
  }

  return {};
}

/**
 * Persists the snap state
 *
 * @param key - The key to set
 * @param value - The value to set
 */
async function setItem(key: string, value: Json) {
  const currentState = await getState();
  currentState[key] = value;
  await updateState(currentState);
}

/**
 * Retrieves the snap state
 *
 * @param key - The key to retrieve
 */
async function getItem(key: string): Promise<Json | undefined> {
  const currentState = await getState();
  return currentState[key];
}

/**
 * Removes an item from the snap state
 *
 * @param key - The key to remove
 */
async function removeItem(key: string) {
  const currentState = await getState();
  delete currentState[key];
  await updateState(currentState);
}

/**
 * Clears the snap state
 */
async function clear() {
  await updateState({});
}

type SnapMap = {
  setItem: typeof setItem;
  getItem: typeof getItem;
  removeItem: typeof removeItem;
  clear: typeof clear;
}

/**
 * Creates a mapping of the snap state
 *
 * @returns A mapping of the snap state
 */
async function createMapping(): Promise<SnapMap> {
  return {
    setItem,
    getItem,
    removeItem,
    clear,
  };
}

const state = {
  setItem,
  getItem,
  removeItem,
  clear,
  createMapping,
};

export default state;
