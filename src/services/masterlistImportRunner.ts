import {
  analyzeSheets,
  MasterlistLoadError,
  readSpreadsheetFile,
  type ImportAnalysis,
  type LoadErrorCode,
} from './masterlistImport';
import type { WorkerMessage } from './masterlistImport.worker';

/**
 * Imports a masterlist file in a Web Worker (UI stays smooth) and reports real progress:
 *   1 = checking file, 2 = opening Excel/CSV, 3 = scanning columns & students.
 * Falls back to the main thread if Workers are unavailable.
 */
export const importMasterlistFile = (
  file: File,
  onStage: (stage: number) => void
): Promise<ImportAnalysis> => {
  onStage(1);

  const runOnMainThread = async () => {
    onStage(2);
    const sheets = await readSpreadsheetFile(file);
    onStage(3);
    await new Promise((r) => requestAnimationFrame(() => r(null))); // let "Scanning" paint
    return analyzeSheets(file.name, sheets);
  };

  let worker: Worker;
  try {
    worker = new Worker(new URL('./masterlistImport.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return runOnMainThread();
  }

  return new Promise<ImportAnalysis>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      settled = true;
      worker.terminate();
    };
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === 'stage') onStage(m.stage);
      else if (m.type === 'done') {
        finish();
        resolve(m.analysis);
      } else {
        finish();
        reject(new MasterlistLoadError(m.code as LoadErrorCode, m.message));
      }
    };
    worker.onerror = (ev) => {
      ev.preventDefault();
      if (settled) return;
      finish();
      // Worker failed to start (old browser / blocked) → do it on the main thread instead
      runOnMainThread().then(resolve, reject);
    };
    worker.postMessage({ file });
  });
};
