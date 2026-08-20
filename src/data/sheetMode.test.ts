import { deriveSheetMode } from './sheetMode';

describe('deriveSheetMode', () => {
  it('maps "pdf" source to "pdf" sheet mode', () => {
    expect(deriveSheetMode('pdf')).toBe('pdf');
  });

  it('maps "musicxml" source to "musicxml" sheet mode', () => {
    expect(deriveSheetMode('musicxml')).toBe('musicxml');
  });

  it('maps "type" source to "musicxml" sheet mode', () => {
    expect(deriveSheetMode('type')).toBe('musicxml');
  });
});
