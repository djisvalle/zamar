const mockCopy = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  const mockFile = jest.fn().mockImplementation((...args: string[]) => ({
    uri: args.length > 1 ? `${args[0]}${args[1]}` : args[0],
    copy: mockCopy,
  }));
  return {
    File: mockFile,
    Paths: { document: 'file:///docs/' },
  };
});

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { pickAndCopySheetFile, PDF_MIME_TYPES } from './importSheetFile';

const mockFile = jest.mocked(File);

describe('pickAndCopySheetFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user cancels', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });
    const result = await pickAndCopySheetFile(PDF_MIME_TYPES);
    expect(result).toBeNull();
    expect(mockCopy).not.toHaveBeenCalled();
  });

  it('copies the picked file into the document directory and returns its uri/name', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/abc.pdf', name: 'My Song.pdf' }],
    });
    mockCopy.mockResolvedValue(undefined);

    const result = await pickAndCopySheetFile(PDF_MIME_TYPES);

    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: PDF_MIME_TYPES, copyToCacheDirectory: true, multiple: false }),
    );
    expect(mockFile).toHaveBeenNthCalledWith(1, 'file:///cache/abc.pdf');
    expect(mockCopy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ uri: expect.stringContaining('My Song.pdf'), name: 'My Song.pdf' });
  });

  it('propagates a copy failure to the caller', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/broken.pdf', name: 'broken.pdf' }],
    });
    mockCopy.mockRejectedValue(new Error('disk full'));

    await expect(pickAndCopySheetFile(PDF_MIME_TYPES)).rejects.toThrow('disk full');
  });
});
