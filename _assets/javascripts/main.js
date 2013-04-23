// Constants
var width = 640,
  height = 640,
  margin = 50,
  nodeWidth = 240,
  nodeHeight = 50;

// Simulation variables
var clock,
  sender,
  receiver,
  system,
  loopTimer,
  targetSimSpeed,
  started,
  paused,
  dataseq,
  receivedData;

// Animation variables
var ctx,
  statusColors = {
    ready: 'transparent',
    error: 'transparent',
    discard: '#c00000',
    accept: '#00c000'
  },
  frameColors,
  fps = 60;

function start() {
  var vars = getVariables();
  clearTimeout(loopTimer);

  // start the simulation at 1 second before operating
  clock = new Clock(-1, 13);
  clock.addEvent({
    time: clock.dtMin,
    interval: 1,
    func: operate
  });
  if (vars.protocol == 'gbn') {
    sender = new GbnNode(vars.w, vars.a);
    receiver = new GbnNode(vars.w, vars.a);
  } else {
    sender = new SrNode(vars.w, vars.a);
    receiver = new SrNode(vars.w, vars.a);
  }
  system = new System(vars.a, vars.p, sender, receiver);
  system.setClock(clock);

  started = true;
  paused = false;
  $('#pause').html('Pause');
  dataseq = 1;
  receivedData = [];
  drawBackground();
  drawNodes();

  startLoop();
  return false;
}

function operate() {
  receivedData = receiver.recv();
  // do something
  try {
    sender.send('#' + dataseq);
    dataseq++;
  } catch (e) {
    // sender may throw an error if its buffer is full
  }
}

function tick() {
  try {
    clock.advance(targetSimSpeed / fps);
  } catch (ex) {
    alert(ex);
    throw ex;  // brutal way to stop the loop
  }
  drawBackground();
  drawPrimaryLink();
  drawSecondaryLink();
  drawSenderWindow();
  drawReceiverWindow();
  drawNodes();
  drawStatistics();
}

function startLoop() {
  var currentLoopTime = Date.now();
  tick();
  loopTimer = setTimeout(function () {
    if (!paused)
      startLoop();
  }, Math.max(0, 1000 / fps - Date.now() + currentLoopTime));
}

function pause() {
  paused = !paused;
  if (started && !paused)
    startLoop();
  $('#pause').html(paused ? 'Resume' : 'Pause');
  return false;
}

function getVariables() {
  return {
    protocol: $('[name=protocol]:checked').val(),
    w: getVariable('#w', true),
    a: getVariable('#a', true),
    p: getVariable('#p')
  };
}

function getVariable(selector, round) {
  var v = Number($(selector).val().replace(/[^0-9.]/g, '')),
    min = Number($(selector).attr('min')),
    max = Number($(selector).attr('max'));
  if (isNaN(v))
    v = Number($(selector).attr('value'));
  if (round)
    v = Math.round(v);
  if (v < min)
    v = min;
  if (v > max)
    v = max;
  $(selector).val(v);
  return v;
}

function computeUtilization() {
  var vars = getVariables(),
    u = 0;
  if (vars.protocol == 'gbn') {
    if (vars.w >= 1 + 2 * vars.a) {
      u = (1 - vars.p) / (1 + 2 * vars.a * vars.p);
    } else {
      u = vars.w * (1 - vars.p) / ((1 + 2 * vars.a) * (1 - vars.p + vars.w * vars.p));
    }
  } else {
    // TODO
  }
  $('#u').text(u);
}

function changeSimSpeed(value) {
  targetSimSpeed = Math.pow(10, value / 50);
  $('#speed-value').html(targetSimSpeed.toFixed(1));
}

function prepareCanvas() {
  var canvas = document.createElement('canvas');
  $('.noscript').remove();
  canvas.width = width;
  canvas.height = height;
  ctx = canvas.getContext('2d');
  drawBackground();
  $('#view').append(canvas);
  makeFrameColors();
}

function makeFrameColors() {
  var i, r, g;
  frameColors = [];
  for (i = 0; i <= 128; ++i) {
    r = i.toString(16);
    g = (128 - i).toString(16);
    if (r.length === 1)
      r = '0' + r;
    if (g.length === 1)
      g = '0' + g;
    frameColors[i] = '#' + r + g + '00';
  }
}

function drawBackground() {
  ctx.save();
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawNodes() {
  var w = nodeWidth,
    h = nodeHeight,
    x = (width - w * 2) / 4,
    y0 = margin,
    y1 = height - margin - h;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#606060';
  ctx.fillRect(x, y0, w, h);
  ctx.fillRect(x, y1, w, h);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#202020';
  ctx.strokeRect(x, y0, w, h);
  ctx.strokeRect(x, y1, w, h);
  ctx.restore();
  ctx.save();
  ctx.font = '20px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText('Sender', x + w / 2, y0 + h / 2);
  ctx.fillText('Receiver', x + w / 2, y1 + h / 2);
  ctx.fillStyle = statusColors[receiver.stats.rx];
  ctx.fillRect(x + 12, y1 - 1, 8, 8);
  ctx.restore();
}

function drawPrimaryLink() {
  var w = nodeWidth / 3,
    h = (height - (margin + nodeHeight) * 2) / system.a,
    x = (width - nodeWidth * 2) / 4 + w / 4,
    y = margin + nodeHeight,
    d = (system.a + 1) / 3,
    c = 128 / d,
    i, e, t;
  ctx.save();
  ctx.lineWidth = Math.min(1, h / 20);
  ctx.strokeStyle = '#fff';
  ctx.font = Math.min(h - 1, 14) + 'px Consolas, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (i = 0; i < system.link1.queue.length; ++i) {
    e = system.link1.queue[i];
    t = clock.currentTime - e.time;
    ctx.fillStyle = frameColors[e.error ? Math.round(Math.min(t + 1, d) * c) : 0];
    ctx.fillRect(x, y + t * h, w, h);
    ctx.strokeRect(x, y + t * h, w, h);
    if (h > 1) {
      ctx.fillStyle = '#fff';
      ctx.fillText(e.sn, x + w / 2, y + t * h + h / 2);
    }
  }
  ctx.restore();
}

function drawSecondaryLink() {
  var w = nodeWidth / 3,
    h = (height - (margin + nodeHeight) * 2) / system.a / 4,
    dh = h * 4,
    x = (width - nodeWidth * 2) / 4 + nodeWidth - w * 5 / 4,
    y = height - margin - nodeHeight - h / 2,
    i, e, t;
  ctx.save();
  ctx.font = Math.min(dh - 1, 14) + 'px Consolas, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (i = 0; i < system.link2.queue.length; ++i) {
    e = system.link2.queue[i];
    t = clock.currentTime - e.time;
    ctx.fillStyle = e.func === 'RR' ? '#606060' : '#817339';
    ctx.fillRect(x, y - t * dh, w, h);
    if (h > 1) {
      ctx.fillStyle = '#fff';
      ctx.fillText(e.func + ' ' + e.rn, x + w / 2, y - t * dh + h / 2);
    }
  }
  ctx.restore();
}

function drawSenderWindow() {
  var w = width / sender.txbuf.length,
    h = 10,
    i;
  ctx.save();
  ctx.lineWidth = Math.min(1, 50 / sender.w);
  ctx.strokeStyle = '#fff';
  ctx.font = '13px Consolas, monospace';
  ctx.textBaseline = 'top';
  for (i = 0; i < sender.txbuf.length; ++i) {
    ctx.fillStyle = (i < (sender.txnext - sender.txbase + sender.s) % sender.s) ? '#404040' : '#87cefa';
    ctx.fillRect(i * w, 0, w, h);
    ctx.strokeRect(i * w, 0, w, h);
    if (i === 0 || i === sender.txbuf.length - 1) {
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText((i + sender.txbase) % sender.s, i === 0 ? 3 : width - 3, h + 1);
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Sender Send Window', width / 2, h + 1);
  ctx.restore();
}

function drawReceiverWindow() {
  var w = width / receiver.rxbuf.length,
    h = 10,
    i, e;
  ctx.save();
  ctx.lineWidth = Math.min(1, 50 / receiver.w);
  ctx.strokeStyle = '#fff';
  ctx.font = '13px Consolas, monospace';
  ctx.textBaseline = 'bottom';
  for (i = 0; i < receiver.rxbuf.length; ++i) {
    e = receiver.rxbuf.get(i);
    ctx.fillStyle = e !== undefined ? '#008000' : '#87cefa';
    ctx.fillRect(i * w, height - h, w, h);
    ctx.strokeRect(i* w, height - h, w, h);
    if (i === 0 || i === receiver.rxbuf.length - 1) {
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText((i + receiver.rxbase) % receiver.s, i === 0 ? 3 : width - 3, height - h - 1);
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Receiver Receive Window', width / 2, height - h - 1);
  ctx.restore();
}

function drawStatistics() {
  var h = 18,
    x = width / 2,
    y = margin,
    p = system.link1.stats.errors / Math.max(1, system.link1.stats.total),
    u = receiver.stats.rxiframes / Math.max(1, Math.floor(clock.currentTime - system.a));
  ctx.save();
  ctx.font = (h - 5) + 'px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText('Window size: ' + sender.w, x, y);
  ctx.fillText('t_prop/t_trans: ' + system.a, x, y + h);
  ctx.fillText('Frame error rate (target): ' + system.p, x, y + h * 2);
  ctx.fillText('Frame error rate (current): ' + p.toFixed(8), x, y + h * 3);
  ctx.fillText('Sender timeout: ' + sender.txtimeout, x, y + h * 4);
  ctx.fillText('Utilization: ' + u.toFixed(6), x, y + h * 5);
  ctx.fillText('Elapsed time: ' + clock.currentTime.toFixed(2), x, y + h * 6);
  ctx.restore();
}

function drawReceivedData() {
  var h = 18,
    x = width / 2,
    y = height - margin - nodeHeight,
    t;
  ctx.save();
  ctx.font = '13px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText('Data forwarded to the upper layer:', x, y);
  if (receivedData.length > 0) {
    t = receivedData[0];
    if (receivedData.length > 1)
      t += ' to ' + receivedData[receivedData.length - 1];
    ctx.fillText(t, x, y + h);
  }
  ctx.restore();
}

$(function () {
  if (!!document.createElement('canvas').getContext) {
    prepareCanvas();
    $('#parameters input').keydown(function (e) { if (e.which === 13) start(); });
    $('#start').click(start);
    $('#pause').click(pause);
    $('[name=protocol], #w, #a, #p').change(computeUtilization);
    computeUtilization();
    $('#framerate').change(function () { fps = $(this).val(); });
    $('#speed-slider').slider({
      value: 0,
      min: -50,
      max: 250,
      slide: function (e, ui) {
        changeSimSpeed(ui.value);
      }
    });
    changeSimSpeed($('#speed-slider').slider('value'));
  }
});
