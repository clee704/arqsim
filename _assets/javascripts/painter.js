
function Painter(system, receivedData) {
  this.fps = 60;
  this.system = system;
  this.receivedData = receivedData;
  this.width = 640;
  this.height = 640;
  this.margin = 50;
  this.nodeWidth = 240;
  this.nodeHeight = 50;
  this.svg = null;
  this.statusColors = {
    ready: 'transparent',
    error: 'transparent',
    discard: '#c00000',
    accept: '#00c000'
  };
  this.frameColors = [];
}

Painter.prototype.init = function () {
  $('#display').empty();
  this.svg = d3.select('#display')
      .append('svg')
      .attr('width', 500)
      .attr('height', 500);
  this.svg.append('g').attr('class', 'data-frames');
  this.svg.append('g').attr('class', 'control-frames');
  this.svg.append('g').attr('class', 'nodes');
  this.svg.append('g').attr('class', 'values');
  this._drawNodes();
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

Painter.prototype.drawAll = function () {
  this._drawPrimaryLink();
  this._drawSecondaryLink();
  //this._drawSenderWindow();
  //this._drawReceiverWindow();
  this._displayValues();
};

Painter.prototype._drawNodes = function () {
  var nodes = this.svg.select('.nodes')
        .selectAll('g')
        .data([this.system.node1, this.system.node2])
        .enter()
        .append('g')
        .attr('transform', function (d, i) {
          return 'translate(150, ' + (i * 500) + ')';
        });
  nodes.append('rect')
      .attr('x', -100)
      .attr('y', -50)
      .attr('width', 200)
      .attr('height', 100)
      .attr('rx', 5)
      .attr('ry', 5);
  nodes.append('text')
      .attr('y', function (d, i) { return 25 - 50 * i; })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .text(function (d) { return d.name; });
};

Painter.prototype._drawPrimaryLink = function () {
  var system = this.system,
      currentTime = system.clock.currentTime,
      h = 400 / system.a,
      transform = function (d, i) {
        return 'translate(105, ' + (50 + (currentTime - d.time) * h + h / 2) + ')';
      };
  var frames = this.svg.select('.data-frames')
        .selectAll('g')
        .data(system.link1.queue, function (d) { return d.time; });
  var framesEnter = frames.enter()
        .append('g')
        .attr('class', function (d) {
          return d.error ? 'error' : null;
        })
        .attr('transform', transform);
  framesEnter.append('rect')
      .attr('stroke-width', Math.max(Math.min(h / 20 - 0.25, 1), 0))
      .attr('x', -30)
      .attr('y', -(h / 2))
      .attr('width', 60)
      .attr('height', h);
  if (h > 3) {
    framesEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', Math.min(h * 2 / 3, 14))
        .text(function (d) { return d.sn; });
  }
  frames.transition()
      .duration(0)
      .attr('transform', transform);
  frames.exit()
      .remove();
};

Painter.prototype._drawSecondaryLink = function () {
  var system = this.system,
      currentTime = system.clock.currentTime,
      h = 400 / system.a / 3,
      transform = function (d, i) {
        return 'translate(195, ' + (450 - (currentTime - d.time) * h * 3) + ')';
      };
  var frames = this.svg.select('.control-frames')
        .selectAll('g')
        .data(system.link2.queue, function (d) { return d.time; });
  var framesEnter = frames.enter()
        .append('g')
        .attr('transform', transform);
  framesEnter.append('rect')
      .attr('x', -30)
      .attr('y', -(h / 2))
      .attr('width', 60)
      .attr('height', h);
  if (h > 3) {
    framesEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', Math.min(h * 2, 14))
        .text(function (d) { return d.func + ' ' + d.rn; });
  }
  frames.transition()
      .duration(0)
      .attr('transform', transform);
  frames.exit()
      .remove();
  /*var ctx = this.ctx,
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
  ctx.restore();*/
};

Painter.prototype._displayValues = function () {
  var values = this.svg.select('.values')
        .selectAll('text')
        .data([this.system.clock.currentTime]);
  values.enter()
      .append('text')
      .attr('transform', function (d, i) {
        return 'translate(450, ' + (75 + i * 40) + ')';
      })
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .text(function (d) { return d.toFixed(2); });
  values.transition()
      .duration(0)
      .text(function (d) { return d.toFixed(2); });
};

Painter.prototype._drawSenderWindow = function () {
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

Painter.prototype._drawReceiverWindow = function () {
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
