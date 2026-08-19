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

function pointsToPath(points) {
  if (!points.length) return '';
  var d = 'M ' + points[0].x + ' ' + points[0].y;
  for (var i = 1; i < points.length; i++) d += ' L ' + points[i].x + ' ' + points[i].y;
  return d;
}

var pdfjsLib = null;
var pdfDoc = null;
var scale = 1.5;
var annotateMode = false;
var strokesByPage = {};
var currentStroke = null;
var currentStrokePage = null;

async function ensurePdfJs() {
  if (pdfjsLib) return pdfjsLib;
  var blob = new Blob([window.__PDFJS_SRC__], { type: 'text/javascript' });
  var url = URL.createObjectURL(blob);
  pdfjsLib = await import(/* webpackIgnore: true */ url);
  var workerBlob = new Blob([window.__PDFJS_WORKER_SRC__], { type: 'text/javascript' });
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);
  return pdfjsLib;
}

function redrawStrokes(pageNum) {
  var svg = document.getElementById('ink-page-' + pageNum);
  if (!svg) return;
  svg.innerHTML = '';
  (strokesByPage[pageNum] || []).forEach(function (stroke) {
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pointsToPath(stroke.points));
    path.setAttribute('stroke', stroke.color);
    path.setAttribute('stroke-width', String(stroke.width));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  });
}

function drawLive(svg, stroke) {
  var live = svg.querySelector('#live-stroke');
  if (!live) {
    live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    live.setAttribute('id', 'live-stroke');
    live.setAttribute('fill', 'none');
    live.setAttribute('stroke-linecap', 'round');
    live.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(live);
  }
  live.setAttribute('stroke', stroke.color);
  live.setAttribute('stroke-width', String(stroke.width));
  live.setAttribute('d', pointsToPath(stroke.points));
}

function attachDrawing(svg, pageNum) {
  svg.addEventListener('pointerdown', function (e) {
    if (!annotateMode) return;
    var rect = svg.getBoundingClientRect();
    currentStroke = {
      color: '#d33',
      width: 3,
      points: [{ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }],
    };
    currentStrokePage = pageNum;
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', function (e) {
    if (!annotateMode || !currentStroke || currentStrokePage !== pageNum) return;
    var rect = svg.getBoundingClientRect();
    currentStroke.points.push({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
    drawLive(svg, currentStroke);
  });
  svg.addEventListener('pointerup', function () {
    if (!annotateMode || !currentStroke || currentStrokePage !== pageNum) return;
    strokesByPage[pageNum] = (strokesByPage[pageNum] || []).concat([currentStroke]);
    var live = svg.querySelector('#live-stroke');
    if (live) svg.removeChild(live);
    redrawStrokes(pageNum);
    post({ type: 'strokeComplete', page: pageNum, stroke: currentStroke });
    currentStroke = null;
    currentStrokePage = null;
  });
}

async function renderAllPages() {
  var container = document.getElementById('pages');
  container.innerHTML = '';
  for (var pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    var page = await pdfDoc.getPage(pageNum);
    var viewport = page.getViewport({ scale: scale });

    var wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    var canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    wrapper.appendChild(canvas);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'ink-page-' + pageNum);
    svg.setAttribute('width', String(viewport.width));
    svg.setAttribute('height', String(viewport.height));
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = annotateMode ? 'auto' : 'none';
    wrapper.appendChild(svg);

    container.appendChild(wrapper);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    redrawStrokes(pageNum);
    attachDrawing(svg, pageNum);
  }
  post({ type: 'height', value: container.scrollHeight });
}

async function handleMessage(msg) {
  try {
    if (msg.type === 'load') {
      await ensurePdfJs();
      var bytes = b64ToUint8Array(msg.base64);
      pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      strokesByPage = msg.annotations || {};
      await renderAllPages();
    } else if (msg.type === 'setAnnotateMode') {
      annotateMode = !!msg.value;
      Array.prototype.forEach.call(document.querySelectorAll('svg[id^="ink-page-"]'), function (svg) {
        svg.style.pointerEvents = annotateMode ? 'auto' : 'none';
      });
    } else if (msg.type === 'undoLastStroke') {
      var arr = (strokesByPage[msg.page] || []).slice();
      arr.pop();
      strokesByPage[msg.page] = arr;
      redrawStrokes(msg.page);
    } else if (msg.type === 'clearPage') {
      strokesByPage[msg.page] = [];
      redrawStrokes(msg.page);
    }
  } catch (err) {
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
  handleMessage(msg);
}

document.addEventListener('message', onMessage);
window.addEventListener('message', onMessage);
