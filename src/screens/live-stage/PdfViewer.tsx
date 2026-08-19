import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
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

export function PdfViewer({ fileUri, annotations, onChangeAnnotations }: PdfViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [annotateMode, setAnnotateMode] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(600);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const postedInitialLoad = useRef(false);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  useEffect(() => {
    setError(null);
    setFileBase64(null);
    postedInitialLoad.current = false;
    let cancelled = false;
    (async () => {
      try {
        const file = new File(fileUri);
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
    if (msg.type === 'height') {
      setWebViewHeight(Math.max(msg.value, 200));
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
        source={{ html: PDF_VIEWER_HTML }}
        originWhitelist={['*']}
        onLoadEnd={() => setHtmlLoaded(true)}
        onMessage={handleMessage}
        style={{ height: webViewHeight, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
