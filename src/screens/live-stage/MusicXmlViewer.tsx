import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { useTheme } from '../../theme/ThemeContext';
import { Clef } from '../../data/types';
import { Enharmonic } from '../../music/notes';
import { MUSIC_XML_VIEWER_HTML } from './generated/musicXmlViewerHtml';

interface MusicXmlViewerProps {
  fileUri: string;
  transposeSemi: number;
  clef: Clef;
  enharmonic: Enharmonic;
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

export function MusicXmlViewer({ fileUri, transposeSemi, clef, enharmonic }: MusicXmlViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The web build renders the "not available on web" notice instead of the
    // WebView, so reading the file there is pure waste.
    if (Platform.OS === 'web') return;
    setError(null);
    setFileBase64(null);
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
      }),
    );
  }, [htmlLoaded, fileBase64, transposeSemi, clef, enharmonic, fileUri]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'error') {
      setError(msg.message);
    }
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
  );
}
