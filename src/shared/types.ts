export type SourceRegion = 'SH' | 'SZ';

export type MistakeStatus = 'processing' | 'success' | 'failed';

export interface Settings {
  bailianApiKey: string;
  bailianAppId: string;
  defaultSourceRegion: SourceRegion;
  arkApiKey: string;
}

export interface MistakeItem {
  id: string;
  createdAt: number;
  updatedAt: number;
  sourceRegion: SourceRegion;
  imageDataUrl: string;
  tags: string[];
  question: string;
  answer: string;
  note: string;
  status: MistakeStatus;
}

export interface MistakesStore {
  schemaVersion: 1;
  itemsById: Record<string, MistakeItem>;
  itemOrder: string[];
  exportSelection: string[];
}
