
function Painter(system) {
  this.fps = 60;
  this.system = system;
  this.svg = null;
  this.protocol = this.system.node1.constructor == GbnNode ? 'GBN' : 'SR',
  this.labels = [
    'SN min',
    'SN max',
    'SN next',
    '',
    'Protocol',
    'W',
    'Timeout',
    'a',
    'P',
    'U',
    'Time',
    '',
    'RN min'
  ];
}

Painter.prototype.init = function () {
  $('#display').empty();
  this.svg = d3.select('#display')
      .append('svg')
      .attr('width', 500)
      .attr('height', 500);
  this.svg.append('g').classed('data-frames', true);
  this.svg.append('g').classed('control-frames', true);
  this.svg.append('g').classed('nodes', true);
  this.svg.append('g').classed('values', true);
  this._drawNodes();
};

Painter.prototype.setFps = function (fps) {
  this.fps = fps;
};

Painter.prototype.drawAll = function () {
  this._drawPrimaryLink();
  this._drawSecondaryLink();
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
      h = 400 / system.a;
  var frames = this.svg.select('.data-frames')
        .selectAll('g')
        .data(system.link1.queue, function (d) { return d.time; });
  var framesEnter = frames.enter()
        .append('g')
        .classed('error', function (d) { return d.error; });
  framesEnter.append('rect')
      .attr('stroke-width', Math.max(Math.min(h / 20 - 0.25, 1), 0))
      .attr('x', -33)
      .attr('y', -(h / 2))
      .attr('width', 66)
      .attr('height', h);
  if (h > 3) {
    framesEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', Math.min(h * 2 / 3, 14))
        .text(function (d) { return d.sn; });
  }
  frames.attr('transform', function (d, i) {
    return 'translate(105, ' + (50 + (currentTime - d.time) * h + h / 2) + ')';
  });
  frames.exit().remove();
};

Painter.prototype._drawSecondaryLink = function () {
  var system = this.system,
      currentTime = system.clock.currentTime,
      h = 400 / system.a / 3;
  var frames = this.svg.select('.control-frames')
        .selectAll('g')
        .data(system.link2.queue, function (d) { return d.time; });
  var framesEnter = frames.enter().append('g');
  framesEnter.append('rect')
      .attr('x', -33)
      .attr('y', -(h / 2))
      .attr('width', 66)
      .attr('height', h);
  if (h > 3) {
    framesEnter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', Math.min(h * 2, 14))
        .text(function (d) { return d.func + ' ' + d.rn; });
  }
  frames.attr('transform', function (d, i) {
    return 'translate(195, ' + (450 - (currentTime - d.time) * h * 3) + ')';
  });
  frames.exit().remove();
};

Painter.prototype._displayValues = function () {
  var self = this,
      system = this.system,
      sender = system.node1,
      receiver = system.node2,
      values = this.svg.select('.values')
        .selectAll('g')
        .data([
          sender.txbase % sender.s,
          (sender.txbase + sender.txbuf.length - 1) % sender.s,
          sender.txnext % sender.s,
          '',
          this.protocol,
          sender.w,
          sender.txtimeout,
          sender.a,
          system.link1.currentFrameErrorRate().toFixed(6),
          system.node2.currentUtilization().toFixed(6),
          system.clock.currentTime.toPrecision(3),
          '',
          receiver.rxbase % receiver.s
        ]);
  var valuesEnter = values.enter().append('g');
  valuesEnter.append('text')
      .classed('name', true)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('x', 370)
      .attr('y', function (d, i) { return 70 + i * 25; })
      .text(function (d, i) { return self.labels[i]; });
  valuesEnter.append('text')
      .classed('value', true)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'central')
      .attr('x', 380)
      .attr('y', function (d, i) { return 70 + i * 25; });
  values.select('.value')
      .text(function (d) { return d; });
};
