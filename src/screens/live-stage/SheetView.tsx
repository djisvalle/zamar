import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Song } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { Tag } from '../../ui/Tag';
import { MusicXmlViewer } from './MusicXmlViewer';
import { PdfViewer } from './PdfViewer';

interface SheetViewProps {
  song: Song;
  sourceLabel: string;
  liveKey: string;
  enharmonic: Enharmonic;
  onUpdateSong: (patch: Partial<Song>) => void;
}

export function SheetView({ song, sourceLabel, liveKey, enharmonic, onUpdateSong }: SheetViewProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingTop: 14,
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.textMuted }}>{sourceLabel}</Text>
        <Tag mono>{liveKey}</Tag>
      </View>
      {!song.sheetFileUri ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            No sheet music imported for this song yet.
          </Text>
        </View>
      ) : song.sheetMode === 'pdf' ? (
        <PdfViewer
          fileUri={song.sheetFileUri}
          annotations={song.pdfAnnotations}
          onChangeAnnotations={(next) => onUpdateSong({ pdfAnnotations: next })}
        />
      ) : (
        <MusicXmlViewer
          fileUri={song.sheetFileUri}
          transposeSemi={song.transposeSemi}
          clef={song.clef}
          enharmonic={enharmonic}
        />
      )}
    </View>
  );
}
