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

/**
 * Deletes a copy made by `pickAndCopySheetFile` that is no longer referenced —
 * e.g. the user picked another file, or switched away from the source tab.
 * Best-effort: a file that's already gone (or that we can't delete) is not
 * worth surfacing to the user, since nothing depends on the deletion.
 */
export function discardCopiedSheetFile(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Ignore — leaving one stale copy behind is better than a failed import.
  }
}
