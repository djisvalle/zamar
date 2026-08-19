(function () {
  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
  }

  function b64ToUint8Array(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  function findXmlEntry(files) {
    var names = Object.keys(files);
    var containerName = names.filter(function (n) { return n === 'META-INF/container.xml'; })[0];
    if (containerName) {
      var containerXml = new TextDecoder('utf-8').decode(files[containerName]);
      var containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
      var rootfile = containerDoc.getElementsByTagName('rootfile')[0];
      var fullPath = rootfile && rootfile.getAttribute('full-path');
      if (fullPath && files[fullPath]) return files[fullPath];
    }
    var xmlName = names.filter(function (n) {
      return /\.(musicxml|xml)$/i.test(n) && n.indexOf('META-INF/') !== 0;
    })[0];
    return xmlName ? files[xmlName] : null;
  }

  var osmd = null;
  // Rapid transpose taps can fire overlapping render() calls against the same
  // OSMD instance; only the newest generation is allowed to touch the DOM.
  var renderGeneration = 0;

  async function render(msg) {
    var myGeneration = ++renderGeneration;
    try {
      var bytes = b64ToUint8Array(msg.base64);
      var xmlText;
      if (msg.isCompressed) {
        var files = fflate.unzipSync(bytes);
        var entry = findXmlEntry(files);
        if (!entry) throw new Error('No MusicXML entry found in .mxl archive');
        xmlText = new TextDecoder('utf-8').decode(entry);
      } else {
        xmlText = new TextDecoder('utf-8').decode(bytes);
      }

      var transformed = window.transformMusicXml(xmlText, {
        transposeSemi: msg.transposeSemi,
        enharmonic: msg.enharmonic,
        clef: msg.clef,
      });

      if (!osmd) {
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay('osmd-container', {
          autoResize: false,
          drawTitle: false,
        });
      }
      await osmd.load(transformed);
      if (myGeneration !== renderGeneration) return;
      osmd.render();
    } catch (err) {
      if (myGeneration !== renderGeneration) return;
      post({ type: 'error', message: (err && err.message) || String(err) });
    }
  }

  function onMessage(event) {
    var msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (msg.type === 'render') render(msg);
  }

  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
})();
