import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../ui/Button';
import { EditIcon, TrashIcon, UndoIcon } from '../../ui/icons';
import { Stroke } from '../../data/types';
import { PDF_VIEWER_HTML } from './generated/pdfViewerHtml';

interface PdfViewerProps {
  fileUri: string;
  annotations: Record<number, Stroke[]>;
  onChangeAnnotations: (next: Record<number, Stroke[]>) => void;
}

// The whole file crosses the RN <-> WebView bridge as base64, which costs
// roughly three copies in memory (RN string, JSON-escaped payload, atob output).
// Scanned hymnal PDFs can be very large, so refuse rather than risk an OOM.
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// Android can otherwise load inline HTML with an opaque origin, which blocks
// the <script type="module"> driver and its blob: dynamic import() of pdf.js.
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

export function PdfViewer({ fileUri, annotations, onChangeAnnotations }: PdfViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [annotateMode, setAnnotateMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const postedInitialLoad = useRef(false);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  useEffect(() => {
    // The web build renders the "not available on web" notice instead of the
    // WebView, so reading the file there is pure waste.
    if (Platform.OS === 'web') return;
    setError(null);
    setFileBase64(null);
    postedInitialLoad.current = false;
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
        if (!cancelled) setError('Could not read this PDF file.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  useEffect(() => {
    if (htmlLoaded && fileBase64 !== null && !postedInitialLoad.current) {
      postedInitialLoad.current = true;
      webviewRef.current?.postMessage(
        JSON.stringify({ type: 'load', base64: fileBase64, annotations: annotationsRef.current }),
      );
    }
  }, [htmlLoaded, fileBase64]);

  useEffect(() => {
    if (!postedInitialLoad.current) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'setAnnotateMode', value: annotateMode }));
  }, [annotateMode]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: any;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'page') {
      setCurrentPage(msg.page);
    } else if (msg.type === 'strokeComplete') {
      setCurrentPage(msg.page);
      const pageStrokes = [...(annotationsRef.current[msg.page] || []), msg.stroke as Stroke];
      onChangeAnnotations({ ...annotationsRef.current, [msg.page]: pageStrokes });
    } else if (msg.type === 'error') {
      setError(msg.message);
    }
  }

  function undoLastStroke() {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'undoLastStroke', page: currentPage }));
    const pageStrokes = (annotationsRef.current[currentPage] || []).slice(0, -1);
    onChangeAnnotations({ ...annotationsRef.current, [currentPage]: pageStrokes });
  }

  function clearPage() {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'clearPage', page: currentPage }));
    onChangeAnnotations({ ...annotationsRef.current, [currentPage]: [] });
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
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6, padding: 8 }}>
        <Button
          variant="secondary"
          icon
          size={32}
          active={annotateMode}
          accessibilityLabel="Toggle annotate mode"
          onPress={() => setAnnotateMode((v) => !v)}
        >
          <EditIcon size={15} color={annotateMode ? colors.accent : colors.text} />
        </Button>
        {annotateMode && (
          <>
            <Button variant="secondary" icon size={32} accessibilityLabel="Undo last stroke" onPress={undoLastStroke}>
              <UndoIcon size={15} color={colors.text} />
            </Button>
            <Button variant="secondary" icon size={32} accessibilityLabel="Clear page annotations" onPress={clearPage}>
              <TrashIcon size={15} color={colors.text} />
            </Button>
          </>
        )}
      </View>
      <WebView
        ref={webviewRef}
        source={{ html: PDF_VIEWER_HTML, baseUrl: BASE_URL }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={allowOnlyOwnDocument}
        onLoadEnd={() => setHtmlLoaded(true)}
        onError={() => setError('The sheet music viewer failed to load.')}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
