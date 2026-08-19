import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
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

export function MusicXmlViewer({ fileUri, transposeSemi, clef, enharmonic }: MusicXmlViewerProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);

  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [webViewHeight, setWebViewHeight] = useState(400);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setFileBase64(null);
    let cancelled = false;
    (async () => {
      try {
        const file = new File(fileUri);
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
    if (msg.type === 'height') {
      setWebViewHeight(Math.max(msg.value, 120));
    } else if (msg.type === 'error') {
      setError(msg.message);
    }
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
      source={{ html: MUSIC_XML_VIEWER_HTML }}
      originWhitelist={['*']}
      onLoadEnd={() => setHtmlLoaded(true)}
      onMessage={handleMessage}
      style={{ height: webViewHeight, backgroundColor: 'transparent' }}
    />
  );
}
