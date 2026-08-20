import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { Button } from '@/components/ui/button';
import { useTheme } from '../../theme/ThemeContext';
import { Clef } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { InstrumentsIcon } from '../../ui/icons';
import { InstrumentFilterModal } from './InstrumentFilterModal';
import { MUSIC_XML_VIEWER_HTML } from './generated/musicXmlViewerHtml';

interface MusicXmlViewerProps {
  fileUri: string;
  transposeSemi: number;
  clef: Clef;
  enharmonic: Enharmonic;
  showNoteNames: boolean;
}

export interface MusicXmlInstrument {
  id: string;
  name: string;
}

// MusicXML files are normally small, but the base64 bridge transfer has the
// same memory cost here as it does for PDFs, so the guard is kept identical.
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// Matched to PdfViewer so both viewers load their inline HTML from the same
// (non-opaque) origin.
const BASE_URL = 'https://localhost';

// Defense in depth: the viewer only ever renders its own inline document, so
// refuse every navigation that isn't that document. (A blanket `false` would
// also block iOS's initial load of the inline HTML itself.)
function allowOnlyOwnDocument(request: { url: string }) {
  // Exact origin or a path under it -- a bare `startsWith` would also accept
  // lookalike hosts such as https://localhost.attacker.com/.
  return (
    request.url === 'about:blank' || request.url === BASE_URL || request.url.startsWith(BASE_URL + '/')
  );
}

export function MusicXmlViewer({ fileUri, transposeSemi, clef, enharmonic, showNoteNames }: MusicXmlViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [instruments, setInstruments] = useState<MusicXmlInstrument[]>([]);
  // null = not yet known (defaults to "everything visible" on the WebView
  // side too), so the initial render doesn't need to wait on a round trip.
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // Read by the render-posting effect below without being one of its
  // dependencies -- a visibility change is applied via the fast
  // 'setVisibility' message, not by re-triggering a full reparse.
  const visibleIdsRef = useRef(visibleIds);
  visibleIdsRef.current = visibleIds;

  useEffect(() => {
    // The web build renders the "not available on web" notice instead of the
    // WebView, so reading the file there is pure waste.
    if (Platform.OS === 'web') return;
    setError(null);
    setFileBase64(null);
    setInstruments([]);
    setVisibleIds(null);
    setFilterOpen(false);
    let cancelled = false;
    (async () => {
      try {
        const file = new File(fileUri);
        if (file.size > MAX_FILE_BYTES) {
          if (!cancelled) {
            setError(
              `This file is too large to display (${Math.round(file.size / 1024 / 1024)} MB, limit 15 MB).`,
            );
          }
          return;
        }
        const base64 = await file.base64();
        if (!cancelled) setFileBase64(base64);
      } catch {
        if (!cancelled) setError('Could not read this MusicXML file.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  useEffect(() => {
    if (!htmlLoaded || fileBase64 === null) return;
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'render',
        base64: fileBase64,
        isCompressed: /\.mxl($|\?)/i.test(fileUri),
        transposeSemi,
        enharmonic,
        clef,
        showNoteNames,
        // Reapplies the current instrument filter right after the reparse a
        // transpose/clef change triggers, instead of flashing back to "all
        // visible". Omitted (undefined) before the first 'instruments'
        // message arrives, which the WebView already treats as "all visible".
        visibleIds: visibleIdsRef.current ?? undefined,
      }),
    );
  }, [htmlLoaded, fileBase64, transposeSemi, clef, enharmonic, showNoteNames, fileUri]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'error') {
      setError(msg.message);
    } else if (msg.type === 'instruments') {
      const list: MusicXmlInstrument[] = (msg.list as { id: string; name: string | null }[]).map((item, i) => ({
        id: item.id,
        name: item.name && item.name.trim() ? item.name.trim() : `Part ${i + 1}`,
      }));
      setInstruments(list);
      setVisibleIds((prev) => {
        if (prev === null) return list.map((inst) => inst.id);
        const stillValid = prev.filter((id) => list.some((inst) => inst.id === id));
        return stillValid.length > 0 ? stillValid : list.map((inst) => inst.id);
      });
    }
  }

  function handleChangeVisibleIds(next: string[]) {
    setVisibleIds(next);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'setVisibility', visibleIds: next }));
  }

  // react-native-webview ships no web implementation, so on web the WebView
  // would render a bare error string instead of the viewer.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
          Sheet music viewing isn't available on web yet — use the iOS or Android app.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 4 }}>
        <Text style={{ color: colors.text, textAlign: 'center' }}>Couldn't render this file.</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {instruments.length > 1 && (
        <View className="flex-row justify-end p-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            accessibilityLabel="Filter instruments"
            onPress={() => setFilterOpen(true)}
          >
            <InstrumentsIcon size={15} color={colors.text} />
          </Button>
        </View>
      )}
      <WebView
        ref={webviewRef}
        source={{ html: MUSIC_XML_VIEWER_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={allowOnlyOwnDocument}
        onLoadEnd={() => setHtmlLoaded(true)}
        onError={() => setError('The sheet music viewer failed to load.')}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
      <InstrumentFilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        instruments={instruments}
        visibleIds={visibleIds ?? instruments.map((inst) => inst.id)}
        onChangeVisibleIds={handleChangeVisibleIds}
      />
    </View>
  );
}
