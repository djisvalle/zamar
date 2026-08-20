import { LibrarySort, Song } from './types';
import { noteName } from '../music/notes';

export type LibraryListItem = { type: 'divider'; label: string } | { type: 'song'; song: Song };

export function groupLibrary(songs: Song[], sort: LibrarySort): LibraryListItem[] {
  const sorted = [...songs].sort((a, b) => {
    if (sort === 'key') {
      const d = a.keyIdx - b.keyIdx;
      return d !== 0 ? d : a.title.localeCompare(b.title);
    }
    if (sort === 'artist') {
      const d = a.artist.localeCompare(b.artist);
      return d !== 0 ? d : a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title);
  });

  const groupOf = (song: Song): string => {
    if (sort === 'key') return `Key of ${noteName(song.keyIdx, 'sharp')}`;
    if (sort === 'artist') return song.artist;
    return song.title[0]?.toUpperCase() ?? '#';
  };

  const out: LibraryListItem[] = [];
  let lastGroup: string | null = null;
  for (const song of sorted) {
    const group = groupOf(song);
    if (group !== lastGroup) {
      out.push({ type: 'divider', label: group });
      lastGroup = group;
    }
    out.push({ type: 'song', song });
  }
  return out;
}
