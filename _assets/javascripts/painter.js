function Painter() {
  this.system = null;
  this.svg = null;
  this.$svg = $();

  this.duration = 1000;
  this.ease = {
    frame: 'linear',
    window: 'cubic-in-out'
  };
  this.prevWindowOffset = [null, null];  // tx, rx
  this.prevData = {
    window: []
  };
  this.labels = [
    'SN min',
    'SN max',
    'SN next',
    '',
    'Protocol',
    'W',
    'a',
    '',
    'P',
    'Utilization',
    'Time'
  ];

  this._init();
}

Painter.prototype.setSystem = function (system) {
  this.system = system;
  $('#display').empty();
  this.svg = d3.select('#display')
      .append('div')
      .classed('svg-container', true)
      .append('svg')
      .attr('width', "100%")
      .attr('height', this.height);
  this.$svg = $('#display svg');
  this.svg.append('g').classed('data-frames', true);
  this.svg.append('g').classed('control-frames', true);
  this.svg.append('g').classed('nodes', true);
  this.svg.append('g').classed('window', true)
      .call(function () { this.append('g').classed('tx-window', true); })
      .call(function () { this.append('g').classed('rx-window', true); });
  this.svg.append('g').classed('values', true);
  this.prevWindowOffset = [null, null];
  this.resize();
};

Painter.prototype.setTransitionDuration = function (duration) {
  this.duration = duration;
};

Painter.prototype.draw = function (instant) {
  this._drawNodes(instant);
  this._drawWindows(instant);
  this._drawPrimaryLink(instant);
  this._drawSecondaryLink(instant);
  this._displayValues(instant);
};

Painter.prototype.resize = function () {
  var offset = this.$svg.offset() || {top: 0};
  this.width = Math.max(this.$svg.width(), 256);
  this.height = Math.min(
      Math.min(Math.max($(window).height() - offset.top - 40, 320), 480),
      this.width);
  this.$svg.height(this.height);
  this.nodeWidth = Math.min(Math.max(this.width / 3, 100), 240);
  this.nodeHeight = this.height / 10;
  this.windowHeight = this.system.params.w > 100 ? 0 : this.height / 40;
  this.margin = Math.max(this.width / 5 - 40, 10);
  this.lineHeight = this.height / 16;
};

Painter.prototype._init = function () {
  this._drawLegend();
};

Painter.prototype._drawLegend = function () {
  var defaultWidth = 100,
      defaultHeight = 30,
      dx = defaultWidth / 2,
      dy = defaultHeight / 2,
      createSvg = function (options) {
        var svg = d3.select(options.selector)
          .append('svg')
          .attr('width', defaultWidth)
          .attr('height', defaultHeight)
          .append('g')
          .classed(options.class_, true)
          .attr('transform', 'translate(' + dx + ',' + dy + ')');
        if (options.innerClass) {
          svg = svg.append('g').classed(options.innerClass, true);
        }
        return svg;
      },
      addRect = function (selection, options) {
        return selection.append('rect')
          .attr('x', -dx)
          .attr('y', -((options.height || defaultHeight) / 2))
          .attr('width', defaultWidth)
          .attr('height', options.height || defaultHeight)
          .call(function () {
            if (!options.rx) return;
            this.attr('rx', options.rx).attr('ry', options.ry);
          });
      },
      addText = function (selection, options) {
        return selection.append('text').text(options.text);
      },
      createSymbol = function (options) {
        createSvg(options).call(addRect, options).call(addText, options);
      };
  createSymbol({
    selector: '#legend .node',
    class_: 'nodes',
    text: 'Name',
    rx: 5,
    ry: 5
  });
  createSymbol({
    selector: '#legend .frame',
    class_: 'data-frames',
    text: 'SN'
  });
  createSymbol({
    selector: '#legend .frame.error',
    class_: 'data-frames',
    innerClass: 'error',
    text: 'SN'
  });
  createSymbol({
    selector: '#legend .ack',
    class_: 'control-frames',
    text: 'ACK SN',
    height: dy
  });
  createSymbol({
    selector: '#legend .nack',
    class_: 'control-frames',
    text: 'NAK SN',
    height: dy
  });
};

Painter.prototype._drawNodes = function (_) {
  var self = this,
      dx = this.margin + this.nodeWidth / 2,
      nodes = this.svg.select('.nodes')
        .selectAll('g')
        .data([this.system.node1, this.system.node2]);
  nodes.enter()
      .append('g')
      .call(function () {
        this.append('rect').attr('rx', 5).attr('ry', 5);
      })
      .call(function () {
        this.append('text').text(function (d) { return d.name; });
      });
  nodes.attr('transform', function (d, i) {
    var dy = (i * self.height);
    return 'translate(' + dx + ',' + dy + ')';
  });
  nodes.select('rect')
      .attr('x', -(this.nodeWidth / 2))
      .attr('y', -(this.nodeHeight + this.windowHeight))
      .attr('width', this.nodeWidth)
      .attr('height', (this.nodeHeight + this.windowHeight) * 2);
  nodes.select('text')
      .attr('y', function (d, i) {
        return (i - 0.5) * -(self.nodeHeight + self.windowHeight * 2);
      });
};

Painter.prototype._drawWindows = function (instant) {
  var transmitter = this.system.node1,
      receiver = this.system.node2;
  this._drawWindow({
    selector: '.tx-window',
    y: 0,
    offsetIndex: 0,
    buffer: transmitter.txbuf,
    snBase: transmitter.txbase,
    s: transmitter.s,
    w: transmitter.w,
    instant: instant
  });
  this._drawWindow({
    selector: '.rx-window',
    y: this.height - this.windowHeight,
    offsetIndex: 1,
    buffer: receiver.rxbuf,
    snBase: receiver.rxbase,
    s: receiver.s,
    w: receiver.rxwin,
    instant: instant
  });
};

Painter.prototype._drawWindow = function (args) {
  if (this.windowHeight == 0) return;
  var self = this,
      w = this.width / args.w,
      h = this.windowHeight,
      data = args.instant ? this.prevData.window[args.offsetIndex]
                          : args.buffer.toArray(0, args.w),
      prevWindowOffset = self.prevWindowOffset[args.offsetIndex],
      // Prevent glitch when simulation speed changes from very large to small
      // or when simulation starts
      duration = args.instant ? 0
        : (prevWindowOffset === null) ||
          (data[0][0] - prevWindowOffset > args.w) ? 0 : this.duration,
      translateA = function (d, i) {
        var dx = w * (d[0] - (prevWindowOffset || 1) + 1) + w / 2,
            dy = args.y + h / 2;
        return 'translate(' + dx + ',' + dy + ')';
      },
      translateB = function (d, i) {
        var dx = w * (d[0] - (data[0][0] || 0)) + w / 2,
            dy = args.y + h / 2;
        return 'translate(' + dx + ',' + dy + ')';
      },
      win = this.svg.select(args.selector)
        .attr('font-size', Math.min(w, h) * 3 / 4)
        .selectAll('g')
        .data(data, function (d) { return d[0]; });
  // enter
  win.enter()
      .append('g')
      .attr('transform', translateA)
      .call(function () { this.append('rect'); })
      .call(function () {
        this.append('text')
            .text(function (d, i) {
              return (args.snBase + i) % args.s;
            });
      })
      .transition()
      .duration(duration)
      .ease(this.ease.window)
      .attr('transform', translateB);
  // immediate update
  win.classed('null', function (d) { return d[1] === null; })
      .select('rect')
      .attr('x', -(w * 127 / 128 / 2))
      .attr('y', -(h / 2))
      .attr('width', w * 127 / 128)
      .attr('height', h);
  // transition
  win.transition()
      .duration(duration)
      .ease(this.ease.window)
      .attr('transform', translateB);
  // exit
  win.exit()
      .classed('null', function (d) { return d[1] === null; })
      .transition()
      .duration(duration)
      .ease(this.ease.window)
      .attr('transform', translateB)
      .remove();
  this.prevWindowOffset[args.offsetIndex] = data[0][0] + 1;
  this.prevData.window[args.offsetIndex] = data;
};

Painter.prototype._drawPrimaryLink = function (instant) {
  var self = this,
      system = this.system,
      currentTime = system.clock.currentTime,
      w = this.nodeWidth / 3,
      hOffset = this.nodeHeight + this.windowHeight,
      h = (this.height - hOffset * 2) / system.params.a,
      dx = self.margin + self.nodeWidth / 4,
      fontSize = Math.min(h * 2 / 3, 14),
      data = instant ? this.prevData.primaryLink : system.link1.queue,
      translateA = function (d, i) {
        var dy = hOffset + (currentTime - d.time) * h + h / 2;
        return 'translate(' + dx + ',' + dy + ')';
      },
      translateB = function (d, i) {
        var dy = hOffset + (currentTime - d.time + 1) * h + h / 2;
        return 'translate(' + dx + ',' + dy + ')';
      };
      dataFrames = this.svg.select('.data-frames')
        .attr('font-size', fontSize)
        .selectAll('g')
        .data(data, function (d) { return d.time; });
  // enter
  dataFrames.enter()
      .append('g')
      .classed('error', function (d) { return d.error; })
      .attr('transform', translateA)
      .call(function () { this.append('rect'); })
      .call(function () {
        if (fontSize < 7) return;
        this.append('text').text(function (d) { return d.sn; });
      });
  // immediate update
  dataFrames.select('rect')
      .attr('x', -(w / 2))
      .attr('y', -(h * 127 / 128 / 2))
      .attr('width', w)
      .attr('height', h * 127 / 128);
  // transition
  dataFrames.transition()
      .duration(instant ? 0 : this.duration)
      .ease(this.ease.frame)
      .attr('transform', translateB);
  // exit
  dataFrames.exit().remove();
  this.prevData.primaryLink = data;
};

Painter.prototype._drawSecondaryLink = function (instant) {
  var self = this,
      system = this.system,
      currentTime = system.clock.currentTime,
      w = this.nodeWidth / 3,
      hOffset = this.nodeHeight + this.windowHeight,
      h = (this.height - hOffset * 2) / system.params.a / 3,
      dx = this.margin + this.nodeWidth - this.nodeWidth / 4,
      fontSize = Math.min(h * 2, 14),
      data = instant ? this.prevData.secondaryLink : system.link2.queue,
      translateA = function (d, i) {
        var dy = (self.height - hOffset) - (currentTime - d.time) * h * 3;
        return 'translate(' + dx + ',' + dy + ')';
      },
      translateB = function (d, i) {
        var dy = (self.height - hOffset) - (currentTime - d.time + 1) * h * 3;
        return 'translate(' + dx + ',' + dy + ')';
      },
      controlFrames = this.svg.select('.control-frames')
        .attr('font-size', fontSize)
        .selectAll('g')
        .data(data, function (d) { return d.time; });
  // enter
  controlFrames.enter()
      .append('g')
      .attr('transform', translateA)
      .call(function () { this.append('rect'); })
      .call(function () {
        if (fontSize < 7) return;
        this.append('text').text(function (d) { return d.func + ' ' + d.sn; });
      });
  // immediate update
  controlFrames.select('rect')
      .attr('x', -(w / 2))
      .attr('y', -(h / 2))
      .attr('width', w)
      .attr('height', h);
  // transition
  controlFrames.transition()
      .duration(instant ? 0 : this.duration)
      .ease(this.ease.frame)
      .attr('transform', translateB);
  // exit
  controlFrames.exit().remove();
  this.prevData.secondaryLink = data;
};

Painter.prototype._displayValues = function (instant) {
  var self = this,
      system = this.system,
      transmitter = system.node1,
      receiver = system.node2,
      currentTime = system.clock.currentTime,
      x = this.width / 2 + (this.margin + this.nodeWidth) / 2,
      data = instant ? this.prevData.values : [
        transmitter.txbase,
        (transmitter.txbase + transmitter.w - 1) % transmitter.s,
        transmitter.txnext,
        '',
        system.params.protocol,
        system.params.w,
        system.params.a,
        '',
        ~~(receiver.currentBlockErrorRate() * 1e6) / 1e6,
        ~~(receiver.currentUtilization() * 1e6) / 1e6,
        ~~currentTime
      ],
      values = this.svg.select('.values')
        .selectAll('g')
        .data(data);
  values.enter()
      .append('g')
      .call(function () {
        this.append('text').classed('name', true)
            .text(function (d, i) { return self.labels[i]; });
      })
      .call(function () {
        this.append('text').classed('value', true);
      });
  values.select('.name')
      .attr('x', x - 5)
      .attr('y', function (d, i) {
        return (i + 2.5) * self.lineHeight;
      });
  values.select('.value')
      .attr('x', x + 5)
      .attr('y', function (d, i) {
        return (i + 2.5) * self.lineHeight;
      })
      .text(function (d) { return d; });
  this.prevData.values = data;
};
