import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

export const PDF_MIME_TYPES = ['application/pdf'];

// .mxl is a zip container and OS pickers frequently report it with a
// generic/zip MIME type rather than the MusicXML-specific ones.
export const MUSICXML_MIME_TYPES = [
  'application/vnd.recordare.musicxml+xml',
  'application/vnd.recordare.musicxml',
  'application/zip',
  'application/octet-stream',
];

export interface PickedSheetFile {
  uri: string;
  name: string;
}

export async function pickAndCopySheetFile(mimeTypes: string[]): Promise<PickedSheetFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: mimeTypes,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const picked = new File(asset.uri);
  const dest = new File(Paths.document, `${Date.now()}-${asset.name}`);
  await picked.copy(dest);

  return { uri: dest.uri, name: asset.name };
}
