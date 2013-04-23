function CircularBuffer(length, fillValue) {
  this.base = 0;
  this.length = length;
  this.buffer = new Array(length);
  while (length--) {
    this.buffer[length] = fillValue;
  }
}

CircularBuffer.prototype.get = function (i) {
  var n = this.length;
  return this.buffer[((i + this.base) % n + n) % n];
};

CircularBuffer.prototype.set = function (i, elem) {
  var n = this.length;
  this.buffer[((i + this.base) % n + n) % n] = elem;
};

CircularBuffer.prototype.push = function (elem) {
  var base = this.base,
      buffer = this.buffer,
      ret = buffer[base];
  buffer[base] = elem;
  this.base = (base + 1) % this.length;
  return ret;
};

CircularBuffer.prototype.toString = function () {
  var temp = [],
      i,
      n = this.length;
  for (i = 0; i < n; ++i) {
    temp.push(this.get(i));
  }
  return temp.join(',');
};
function Clock(currentTime, prec) {
  prec = Math.floor(prec);
  if (prec < 10) {
    throw new RangeError('prec must >= 10');
  }
  this.dtMin = 1 / Math.pow(2, prec);
  this.currentTime = Math.floor(currentTime / this.dtMin) * this.dtMin;
  this.timeMax = Math.pow(2, 53 - prec) - 1;
  this.events = new Heap(function (ev) { return ev.time; });
  this.nextId = 0;
}

Clock.prototype.advance = function (dtRaw) {
  var events = this.events,
      currentTime = this.currentTime,
      dtMin = this.dtMin,
      ticks = Math.floor(dtRaw / dtMin),
      dt = dtMin * ticks,
      endTime = currentTime + dt,
      i,
      ev,
      time,
      id,
      interval;
  if (currentTime >= this.timeMax - dt) {
    throw new Error('maximum simulation time reached');
  }
  while ((ev = events.peek()) && (time = ev.time) <= endTime) {
    ev = events.pop();
    id = ev.id;
    interval = ev.interval;
    this.currentTime = time;
    ev.func.apply(ev.obj, ev.args);
    if (interval > 0) {
      ev.time += interval;
      events.push(ev);
    }
  }
  this.currentTime = endTime;
};

Clock.prototype.addEvent = function (args) {
  // args = {time, interval, func, obj, args}
  // args.time is relative to current time.
  // args.interval makes the event periodic (if args.interval > 0).
  // Callbacks are called as args.func.apply(args.obj, args.args).
  //
  // Use integer multiples of this.dtMin for time and interval values
  // for consistent order of execution of events when this.currentTime
  // becomes very large.
  var time = args.time,
      interval = args.interval,
      func = args.func,
      obj = args.obj,
      args = args.args,
      id;
  if (time < this.currentTime) {
    throw new Error('cannot add an event in the past');
  }
  id = this.nextId++;
  this.events.push({
    id: id,
    time: time + this.currentTime,
    interval: interval,
    func: func,
    obj: obj,
    args: args
  });
  return id;
};
// Implementation copied from "heapq", arr Python standard library module

function Heap(key) {
  // pop() returns elem such that key(elem) is lowest
  this.arr = [];
  this.key = key;
}

Heap.prototype.push = function (elem) {
  var arr = this.arr;
  arr.push(elem);
  this._siftUp(0, arr.length - 1);
};

Heap.prototype.pop = function () {
  var arr = this.arr,
      lastelem = arr.pop(),
      elem;
  if (arr.length) {
    elem = arr[0];
    arr[0] = lastelem
    this._siftDown(0);
  } else {
    elem = lastelem;
  }
  return elem;
};

Heap.prototype.peek = function () {
  return this.arr[0];
};

Heap.prototype.length = function () {
  return this.arr.length;
};

Heap.prototype._siftUp = function (start, i) {
  var arr = this.arr,
      key = this.key,
      elem = arr[i],
      i_p,
      parent;
  while (start < i) {
    i_p = (i - 1) >> 1;
    parent = arr[i_p];
    if (key(elem) < key(parent)) {
      arr[i] = parent;
      i = i_p;
    } else {
      break;
    }
  }
  arr[i] = elem;
};

Heap.prototype._siftDown = function (i) {
  var arr = this.arr,
      key = this.key,
      elem = arr[i],
      start = i,
      end = arr.length,
      i_c = (i << 1) + 1,
      i_rc,
      child,
      rchild;
  while (i_c < end) {
    i_rc = i_c + 1;
    child = arr[i_c];
    if (i_rc < end) {
      rchild = arr[i_rc];
      if (key(rchild) < key(child)) {
        i_c = i_rc;
        child = rchild;
      }
    }
    arr[i] = child;
    i = i_c;
    i_c = (i << 1) + 1;
  }
  arr[i] = elem;
  this._siftUp(start, i);
};
function Link(a, p) {
  this.a = a; // ratio of propagation delay relative to transmission time
  this.p = p; // frame error rate for txqueue
  this.queue = [];
  this.stats = {errors: 0, total: 0};
}

Link.prototype.setClock = function (clock) {
  this.clock = clock;
};

Link.prototype.write = function (frame) {
  var stats = this.stats,
      time = this.clock.currentTime,
      i,
      queue = this.queue,
      n = queue.length;
  if (frame.type === 'I') {
    frame.time = time + 1;
    if (Math.random() < this.p) {
      frame.error = 1;
    }
    queue.push(frame);
  } else {
    // put the frame in the queue at the right position
    frame.time = time;
    if (n === 0 || queue[n - 1].time < time) {
      queue.push(frame);
    } else {
      for (i = n - 2; i >= 0; i--) {
        if (queue[i].time < time) {
          break;
        }
      }
      queue.splice(i + 1, 0, frame);
    }
  }
  if (frame.error) {
    stats.errors++;
  }
  stats.total++;
};

Link.prototype.read = function () {
  var a = this.a,
      queue = this.queue,
      currentTime = this.clock.currentTime,
      i,
      n = this.queue.length,
      ret;
  for (i = 0; i < n; ++i) {
    if (currentTime - queue[i].time < a) {
      break;
    }
  }
  if (i === 0) {
    return;
  }
  ret = queue[i - 1];
  queue.splice(0, i);
  return ret;
};
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
function Node(w, a) {
  this.w = w; // window size
  this.a = a; // ratio of propagation delay relative to transmission time
  this.txbuf = new CircularBuffer(w);
  this.txbase = 0;
  this.txnext = 0; // sequence number of the first unsent frame
  this.txuser = 0; // index of the first available slot in txbuf
  this.rxbase = 0;
  this.rxuser = 0; // index + 1 of the last received frame in rxbuf
  this.stats = {rx: 'ready', rxiframes: 0};

  // follwing variables must be set before using this instance
  this.clock = undefined;
  this.txlink = undefined;
  this.rxlink = undefined;

  // following variables must be defined in a subclass
  this.s = undefined; // # of sequence numbers
  this.txtimers = undefined;
  this.rxbuf = undefined;

  // following methods must be implemented in a subclass
  // _recvI, _recvS, _checkTimeout, _setTimer
}

Node.prototype.setClock = function (clock) {
  var self = this;
  this.clock = clock;
  this.clock.addEvent({
    time: 1,
    interval: 1,
    func: function () { self._operate(); }
  });
};

Node.prototype.setLinks = function (txlink, rxlink) {
  this.txlink = txlink;
  this.rxlink = rxlink;
};

Node.prototype.send = function (data) {
  var w = this.w,
      i = this.txuser;
  if (!this.txlink) {
    throw new Error('link not connected');
  }
  if (i === w) {
    throw new Error('buffer full');
  } else {
    assert(i < w);
    this.txbuf.set(i, data);
    this.txuser++;
  }
};

Node.prototype.recv = function () {
  var rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      data = [];
  while (rxbuf.get(0) !== undefined) {
    data.push(rxbuf.push());
    rxbase++;
    rxuser--;
  }
  this.rxbase = rxbase % this.s;
  this.rxuser = rxuser;
  return data;
};

Node.prototype._operate = function () {
  this._checkTimeout();
  this._recv();
  this._send();
};

Node.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.stats.rx = 'ready';
  } else if (frame.error) {
    this.stats.rx = 'error';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

Node.prototype._send = function () {
  var s = this.s,
      sn = this.txnext,
      i = (sn - this.txbase + s) % s;
  if (i < this.txuser) {
    this.txlink.write({type: 'I', sn: sn, data: this.txbuf.get(i)});
    this.txnext = (sn + 1) % s;
    this._setTimer(this.clock.currentTime, sn, i);
  }
};


function GbnNode(w, a) {
  Node.call(this, w, a);
  this.s = 1 << Math.ceil(Math.log(w + 1) / Math.log(2)); // # of sequence numbers
  this.txtimers = new CircularBuffer(w);
  this.txtimeout = a * 2 + 2;
  this.rxbuf = new CircularBuffer(1); // dummy
  this.rxrejd = false; // needed to send REJ only once per go-back
}
GbnNode.prototype = new Node;
GbnNode.prototype.constructor = GbnNode;

GbnNode.prototype._recvI = function (frame) {
  var s = this.s,
      rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      i = (frame.sn - rxbase + s) % s;
  this.stats.rx = 'discard';
  if (i === rxuser && rxbuf.get(i) === undefined) {
    rxbuf.set(i, frame.data);
    rxuser++;
    this.rxuser = rxuser;
    this.rxrejd = false;
    this.stats.rx = 'accept';
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: (rxbase + rxuser) % s});
  } else if (i < this.w && !this.rxrejd) {
    this.rxrejd = true;
    this.txlink.write({type: 'S', func: 'REJ', rn: (rxbase + rxuser) % s});
  }
};

GbnNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      txtimers = this.txtimers,
      rn = frame.rn,
      i = (rn - txbase + s) % s,
      j = (this.txnext - txbase + s) % s;
  if (i > 0 && i <= w) {
    this.txbase = (txbase + i) % s;
    this.txuser -= i;
    while (i-- > 0) {
      txbuf.push();
      txtimers.push();
    }
  }
  if (frame.func === 'REJ' && i < j) {
    this.txnext = rn;
  }
};

GbnNode.prototype._checkTimeout = function () {
  if (this.clock.currentTime - this.txtimers.get(0) >= this.txtimeout)
    this.txnext = this.txbase;
};

GbnNode.prototype._setTimer = function (currentTime, sn, i) {
  this.txtimers.set(i, currentTime);
};


/*function SrNode(w, a) {
  Node.call(this, w, a);
  this.s = 1 << Math.ceil(Math.log(w * 2) / Math.log(2)); // # of sequence numbers
  this.rxbuf = new CircularBuffer(w);
  this.rxlast = -1; // index of the last received frame in rxbuf
  this.rxrejd = false; // needed to send REJ only once per go-back
}
SrNode.prototype = new Node;
SrNode.prototype.constructor = SrNode;

SrNode.prototype._recvI = function (frame) {
  var s = this.s,
      rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      i = (frame.sn - rxbase + s) % s;
  if (i === rxuser && rxbuf.get(i) === undefined) {
    rxbuf.set(i, frame.data);
    rxuser++;
    this.rxuser = rxuser;
    this.rxrejd = false;
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: (rxbase + rxuser) % s});
  } else if (i < this.w && !this.rxrejd) {
    this.rxrejd = true;
    this.txlink.write({type: 'S', func: 'REJ', rn: (rxbase + rxuser) % s});
  }
};

SrNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      rn = frame.rn,
      i = (rn - txbase + s) % s,
      j = (this.txnext - txbase + s) % s;
  if (i > 0 && i <= w) {
    this.txbase = (txbase + i) % s;
    if (this.txuser === w) {
      txbuf.push(this.txextra);
      this.txextra = null;
      i--;
    }
    this.txuser -= i;
    while (i-- > 0) {
      txbuf.push();
    }
  }
  if (frame.func === 'REJ' && i < j) {
    this.txnext = rn;
  }
};

SrNode.prototype._checkTimeout = function () {
  // todo
};

SrNode.prototype._setTimer = function (currentTime, sn, i) {
  // todo
};*/
function System(a, p, node1, node2) {
  this.a = a; // ratio of propagation delay relative to transmission time
  this.p = p; // frame error rate
  this.node1 = node1;
  this.node2 = node2;
  this.link1 = new Link(a, p);
  this.link2 = new Link(a, p);
  this.node1.setLinks(this.link1, this.link2);
  this.node2.setLinks(this.link2, this.link1);
}

System.prototype.setClock = function (clock) {
  this.link1.setClock(clock);
  this.link2.setClock(clock);
  this.node1.setClock(clock);
  this.node2.setClock(clock);
};
function assert(x) {
  if (!x) {
    throw new Error('assertion failed');
  }
}
