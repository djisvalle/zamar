const mockCopy = jest.fn();
const mockDelete = jest.fn();
const mockExists = { value: true };

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  const mockFile = jest.fn().mockImplementation((...args: string[]) => ({
    uri: args.length > 1 ? `${args[0]}${args[1]}` : args[0],
    copy: mockCopy,
    delete: mockDelete,
    get exists() {
      return mockExists.value;
    },
  }));
  return {
    File: mockFile,
    Paths: { document: 'file:///docs/' },
  };
});

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { pickAndCopySheetFile, discardCopiedSheetFile, PDF_MIME_TYPES } from './importSheetFile';

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

describe('discardCopiedSheetFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExists.value = true;
  });

  it('deletes the copy at the given uri', () => {
    discardCopiedSheetFile('file:///docs/123-old.pdf');
    expect(mockFile).toHaveBeenCalledWith('file:///docs/123-old.pdf');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no uri', () => {
    discardCopiedSheetFile(null);
    expect(mockFile).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('skips deletion when the file no longer exists', () => {
    mockExists.value = false;
    discardCopiedSheetFile('file:///docs/gone.pdf');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('swallows a deletion failure', () => {
    mockDelete.mockImplementation(() => {
      throw new Error('permission denied');
    });
    expect(() => discardCopiedSheetFile('file:///docs/locked.pdf')).not.toThrow();
  });
});
