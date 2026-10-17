import { selectDemoRecords, type DemoCity } from './demoRecords.ts';

export const isOfflineDemo = import.meta.env.VITE_DEMO_MODE === '1';
let snapshot: Promise<DemoCity> | undefined;
export async function readDemo<T>(path: string, deps: unknown[]): Promise<T> {
  snapshot ??= fetch('/data/demo-city.json').then(async (response) => {
    if (!response.ok) throw new Error('The demonstration records could not be loaded.');
    return response.json() as Promise<DemoCity>;
  });
  try { return selectDemoRecords(await snapshot, path, deps) as T; }
  catch (error) { snapshot = undefined; throw error; }
}
