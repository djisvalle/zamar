import { SheetMode, SongSource } from './types';

export function deriveSheetMode(source: SongSource): SheetMode {
  return source === 'pdf' ? 'pdf' : 'musicxml';
}
