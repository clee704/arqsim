
function Painter(system, receivedData) {
  this.system = system;
  this.receivedData = receivedData;
  this.fps = 60;
  this.width = 640;
  this.height = 640;
  this.margin = 50;
  this.nodeWidth = 240;
  this.nodeHeight = 50;
  this.ctx = null;
  this.statusColors = {
    ready: 'transparent',
    error: 'transparent',
    discard: '#c00000',
    accept: '#00c000'
  };
  this.frameColors = [];
}

Painter.prototype.init = function () {
  var canvas = document.createElement('canvas');
  $('.noscript').remove();
  canvas.width = this.width;
  canvas.height = this.height;
  this.ctx = canvas.getContext('2d');
  this.drawBackground();
  $('#display').empty();
  $('#display').append(canvas);
  this._makeFrameColors();
};

Painter.prototype._makeFrameColors = function () {
  var i,
      r,
      g;
  for (i = 0; i <= 128; ++i) {
    r = i.toString(16);
    g = (128 - i).toString(16);
    if (r.length === 1) r = '0' + r;
    if (g.length === 1) g = '0' + g;
    this.frameColors[i] = '#' + r + g + '00';
  }
};

Painter.prototype.setFps = function (fps) {
  this.fps = fps;
};

Painter.prototype.drawBackground = function () {
  ctx = this.ctx;
  ctx.save();
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, this.width, this.height);
  ctx.restore();
};

Painter.prototype.drawNodes = function () {
  var ctx = this.ctx,
      w = this.nodeWidth,
      h = this.nodeHeight,
      x = (this.width - w * 2) / 4,
      y0 = this.margin,
      y1 = this.height - this.margin - h;
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
  ctx.fillStyle = this.statusColors[this.system.node2.stats.rx];
  ctx.fillRect(x + 12, y1 - 1, 8, 8);
  ctx.restore();
};

Painter.prototype.drawPrimaryLink = function () {
  var ctx = this.ctx,
      system = this.system,
      frameColors = this.frameColors,
      w = this.nodeWidth / 3,
      h = (this.height - (this.margin + this.nodeHeight) * 2) / system.a,
      x = (this.width - this.nodeWidth * 2) / 4 + w / 4,
      y = this.margin + this.nodeHeight,
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
    t = system.clock.currentTime - e.time;
    ctx.fillStyle = frameColors[e.error ? Math.round(Math.min(t + 1, d) * c) : 0];
    ctx.fillRect(x, y + t * h, w, h);
    ctx.strokeRect(x, y + t * h, w, h);
    if (h > 1) {
      ctx.fillStyle = '#fff';
      ctx.fillText(e.sn, x + w / 2, y + t * h + h / 2);
    };
  };
  ctx.restore();
};

Painter.prototype.drawSecondaryLink = function () {
  var ctx = this.ctx,
      system = this.system,
      w = this.nodeWidth / 3,
      h = (this.height - (this.margin + this.nodeHeight) * 2) / system.a / 4,
      dh = h * 4,
      x = (this.width - this.nodeWidth * 2) / 4 + this.nodeWidth - w * 5 / 4,
      y = this.height - this.margin - this.nodeHeight - h / 2,
      i, e, t;
  ctx.save();
  ctx.font = Math.min(dh - 1, 14) + 'px Consolas, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (i = 0; i < system.link2.queue.length; ++i) {
    e = system.link2.queue[i];
    t = system.clock.currentTime - e.time;
    ctx.fillStyle = e.func === 'RR' ? '#606060' : '#817339';
    ctx.fillRect(x, y - t * dh, w, h);
    if (h > 1) {
      ctx.fillStyle = '#fff';
      ctx.fillText(e.func + ' ' + e.rn, x + w / 2, y - t * dh + h / 2);
    };
  };
  ctx.restore();
};

Painter.prototype.drawSenderWindow = function () {
  var ctx = this.ctx,
      sender = this.system.node1,
      width = this.width,
      w = width / sender.txbuf.length,
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
    };
  };
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Sender Send Window', width / 2, h + 1);
  ctx.restore();
};

Painter.prototype.drawReceiverWindow = function () {
  var ctx = this.ctx,
      receiver = this.system.node2,
      width = this.width,
      height = this.height,
      w = width / receiver.rxbuf.length,
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
    };
  };
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('Receiver Receive Window', width / 2, height - h - 1);
  ctx.restore();
};

Painter.prototype.drawStatistics = function () {
  var ctx = this.ctx,
      system = this.system,
      clock = system.clock,
      sender = system.node1,
      receiver = system.node2,
      width = this.width,
      h = 18,
      x = width / 2,
      y = this.margin,
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
};

Painter.prototype.drawReceivedData = function () {
  var ctx = this.ctx,
      receivedData = this.receivedData,
      h = 18,
      x = this.width / 2,
      y = this.height - this.margin - this.nodeHeight,
      t;
  ctx.save();
  ctx.font = '13px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText('Data forwarded to the upper layer:', x, y);
  if (receivedData.length > 0) {
    t = receivedData[0];
    if (receivedData.length > 1) {
      t += ' to ' + receivedData[receivedData.length - 1];
    }
    ctx.fillText(t, x, y + h);
  };
  ctx.restore();
};
