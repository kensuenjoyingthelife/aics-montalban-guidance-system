/// <reference lib="webworker" />
/**
 * Runs the whole masterlist import (open file → read sheets → scan columns & students)
 * off the main thread, so the UI never freezes on big files or slow school PCs.
 * Posts real progress after each stage.
 */
import readXlsxFile from 'read-excel-file/web-worker';
import { analyzeSheets, MasterlistLoadError, readSpreadsheetFile } from './masterlistImport';

export type WorkerRequest = { file: File };
export type WorkerMessage =
  | { type: 'stage'; stage: number }
  | { type: 'done'; analysis: ReturnType<typeof analyzeSheets> }
  | { type: 'error'; code: string; message: string };

const post = (m: WorkerMessage) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { file } = e.data;
  try {
    post({ type: 'stage', stage: 2 }); // Opening Excel / CSV
    const sheets = await readSpreadsheetFile(file, readXlsxFile as never);
    post({ type: 'stage', stage: 3 }); // Scanning columns & students
    const analysis = analyzeSheets(file.name, sheets);
    post({ type: 'done', analysis });
  } catch (err) {
    post({
      type: 'error',
      code: err instanceof MasterlistLoadError ? err.code : 'unreadable',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
