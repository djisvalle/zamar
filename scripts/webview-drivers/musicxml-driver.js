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

  function instrumentIdOf(inst) {
    return inst.IdString || String(inst.Id);
  }

  // visibleIds === null/undefined means "everything visible" -- the state
  // before RN has ever learned the part list, and the default OSMD itself
  // starts in.
  function applyVisibility(visibleIds) {
    if (!osmd || !osmd.Sheet) return;
    osmd.Sheet.Instruments.forEach(function (inst) {
      inst.Visible = !visibleIds || visibleIds.indexOf(instrumentIdOf(inst)) !== -1;
    });
  }

  function postInstruments() {
    if (!osmd || !osmd.Sheet) return;
    post({
      type: 'instruments',
      list: osmd.Sheet.Instruments.map(function (inst) {
        return { id: instrumentIdOf(inst), name: inst.Name || null };
      }),
    });
  }

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
        showNoteNames: msg.showNoteNames,
      });

      if (!osmd) {
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay('osmd-container', {
          autoResize: false,
          drawTitle: false,
        });
      }
      await osmd.load(transformed);
      if (myGeneration !== renderGeneration) return;
      // Reapply the caller's current filter immediately -- a transpose/clef
      // change reparses the whole score, and without this every such change
      // would flash back to "all instruments visible".
      applyVisibility(msg.visibleIds);
      // updateGraphic() re-derives the graphical staves from Instrument.Visible;
      // a plain render() redraws the already-built graphic sheet and wouldn't
      // add/remove staves on its own (mirrors Instrument.Transpose's contract).
      osmd.updateGraphic();
      osmd.render();
      postInstruments();
    } catch (err) {
      if (myGeneration !== renderGeneration) return;
      post({ type: 'error', message: (err && err.message) || String(err) });
    }
  }

  function setVisibility(msg) {
    if (!osmd) return;
    applyVisibility(msg.visibleIds);
    osmd.updateGraphic();
    osmd.render();
  }

  function onMessage(event) {
    var msg;
    try {
      msg = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (msg.type === 'render') render(msg);
    else if (msg.type === 'setVisibility') setVisibility(msg);
  }

  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);
})();
