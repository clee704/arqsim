function Painter() {
  this.fps = 60;
  this.svg = null;
  this.$svg = $();
  this.width = null;
  this.height = null;
  this.nodeWidth = null;
  this.nodeHeight = null;
  this.margin = null;
  this.lineHeight = null;
  this.labels = [
    'SN min',
    'SN max',
    'SN next',
    '',
    'Protocol',
    'W',
    'a',
    'P',
    'Utilization',
    'Time',
    '',
    'RN'
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
  this._updateDimension();
  this.svg.append('g').classed('data-frames', true);
  this.svg.append('g').classed('control-frames', true);
  this.svg.append('g').classed('nodes', true);
  this.svg.append('g').classed('values', true);
};

Painter.prototype.setFps = function (fps) {
  this.fps = fps;
};

Painter.prototype.draw = function () {
  this._drawNodes();
  this._drawPrimaryLink();
  this._drawSecondaryLink();
  this._displayValues();
};

Painter.prototype._init = function () {
  var self = this,
      resizeTimer,
      callback = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          self._updateDimension();
          self.draw();
        }, 250);
      };
  $(window).resize(callback);
  $('[data-toggle="collapse"]').click(callback);
  this._drawLegend();
};

Painter.prototype._updateDimension = function () {
  var offset = this.$svg.offset();
  this.width = this.$svg.width();
  this.height = Math.min(
      Math.min(Math.max($(window).height() - offset.top - 40, 320), 480),
      this.width);
  this.$svg.height(this.height);
  this.nodeWidth = Math.min(Math.max(this.width / 3, 100), 240);
  this.nodeHeight = this.height / 10;
  this.margin = Math.max(this.width / 5 - 40, 10);
  this.lineHeight = this.height / 16;
};

Painter.prototype._drawLegend = function () {
  var defaultWidth = 100,
      defaultHeight = 30,
      createSvg = function (selector, classes) {
        var svg = d3.select(selector)
          .append('svg')
          .attr('width', defaultWidth)
          .attr('height', defaultHeight)
          .append('g')
          .classed(classes[0], true)
          .attr('transform', 'translate(' + (defaultWidth / 2) + ',' +
            (defaultHeight / 2) + ')');
        if (classes[1]) {
          svg = svg.append('g').classed(classes[1], true);
        }
        return svg;
      },
      addRect = function (svg, options) {
        var rect = svg.append('rect')
          .attr('x', -(defaultWidth / 2))
          .attr('y', -((options.height || defaultHeight) / 2))
          .attr('width', defaultWidth)
          .attr('height', options.height || defaultHeight);
        if (options.rx) {
          rect.attr('rx', options.rx).attr('ry', options.ry);
        }
        return rect;
      },
      addText = function (svg, text) {
        return svg.append('text').text(text);
      },
      createSymbol = function (options) {
        var svg = createSvg(options.selector, options.classes);
        addRect(svg, options);
        addText(svg, options.text);
      }
  createSymbol({
    selector: '#legend .node',
    classes: ['nodes'],
    text: 'Name',
    rx: 5,
    ry: 5
  });
  createSymbol({
    selector: '#legend .frame',
    classes: ['data-frames'],
    text: 'SN'
  });
  createSymbol({
    selector: '#legend .frame.error',
    classes: ['data-frames', 'error'],
    text: 'SN'
  });
  createSymbol({
    selector: '#legend .ack',
    classes: ['control-frames'],
    text: 'RR RN',
    height: defaultHeight / 2
  });
  createSymbol({
    selector: '#legend .nack',
    classes: ['control-frames'],
    text: 'REJ RN',
    height: defaultHeight / 2
  });
};

Painter.prototype._drawNodes = function () {
  var self = this,
      dx = this.margin + this.nodeWidth / 2,
      nodes = this.svg.select('.nodes')
        .selectAll('g')
        .data([this.system.node1, this.system.node2]),
      nodesEnter = nodes.enter().append('g');
  nodesEnter.append('rect')
      .attr('rx', 5)
      .attr('ry', 5);
  nodesEnter.append('text')
      .text(function (d) { return d.name; });
  nodes.attr('transform', function (d, i) {
    var dy = (i * self.height);
    return 'translate(' + dx + ',' + dy + ')';
  });
  nodes.select('rect')
      .attr('x', -(this.nodeWidth / 2))
      .attr('y', -(this.nodeHeight))
      .attr('width', this.nodeWidth)
      .attr('height', this.nodeHeight * 2);
  nodes.select('text')
      .attr('y', function (d, i) {
        return self.nodeHeight / 2 - self.nodeHeight * i;
      });
};

Painter.prototype._drawPrimaryLink = function () {
  var self = this,
      system = this.system,
      currentTime = system.clock.currentTime,
      w = this.nodeWidth / 3,
      h = (this.height - this.nodeHeight * 2) / system.params.a,
      dx = self.margin + self.nodeWidth / 4,
      frames = this.svg.select('.data-frames')
        .selectAll('g')
        .data(system.link1.queue, function (d) { return d.time; }),
      framesEnter = frames.enter()
        .append('g')
        .classed('error', function (d) { return d.error; });
  framesEnter.append('rect');
  if (h > 3) {
    framesEnter.append('text')
        .text(function (d) { return d.sn; });
  }
  frames.attr('transform', function (d, i) {
    var dy = self.nodeHeight + (currentTime - d.time) * h + h / 2;
    return 'translate(' + dx + ',' + dy + ')';
  });
  frames.select('rect')
      .attr('stroke-width', Math.min(Math.max(h / 20 - 0.25, 0), 1))
      .attr('y', -(h / 2))
      .attr('height', h)
      .attr('x', -(w / 2))
      .attr('width', w);
  if (h > 3) {
    frames.select('text').attr('font-size', Math.min(h * 2 / 3, 14));
  } else {
    frames.select('text').remove();
  }
  frames.exit().remove();
};

Painter.prototype._drawSecondaryLink = function () {
  var self = this,
      system = this.system,
      currentTime = system.clock.currentTime,
      w = this.nodeWidth / 3,
      h = (this.height - this.nodeHeight * 2) / system.params.a / 3,
      dx = this.margin + this.nodeWidth - this.nodeWidth / 4,
      frames = this.svg.select('.control-frames')
        .selectAll('g')
        .data(system.link2.queue, function (d) { return d.time; }),
      framesEnter = frames.enter()
        .append('g');
  framesEnter.append('rect');
  if (h > 3) {
    framesEnter.append('text')
        .text(function (d) { return d.func + ' ' + d.rn; });
  }
  frames.attr('transform', function (d, i) {
    var dy = (self.height - self.nodeHeight) - (currentTime - d.time) * h * 3;
    return 'translate(' + dx + ',' + dy + ')';
  });
  frames.select('rect')
      .attr('y', -(h / 2))
      .attr('height', h)
      .attr('x', -(w / 2))
      .attr('width', w);
  if (h > 3) {
    frames.select('text').attr('font-size', Math.min(h * 2, 14));
  } else {
    frames.select('text').remove();
  }
  frames.exit().remove();
};

Painter.prototype._displayValues = function () {
  var self = this,
      system = this.system,
      sender = system.node1,
      receiver = system.node2,
      currentTime = system.clock.currentTime,
      x = this.width / 2 + (this.margin + this.nodeWidth) / 2,
      values = this.svg.select('.values')
        .selectAll('g')
        .data([
          sender.txbase,
          (sender.txbase + sender.w - 1) % sender.s,
          sender.txnext,
          '',
          system.params.protocol,
          system.params.w,
          system.params.a,
          system.link1.currentBlockErrorRate().toFixed(6),
          receiver.currentUtilization().toFixed(6),
          currentTime.toPrecision(3),
          '',
          receiver.rxnext % receiver.s
        ]);
  var valuesEnter = values.enter().append('g');
  valuesEnter.append('text')
      .classed('name', true)
      .text(function (d, i) { return self.labels[i]; });
  valuesEnter.append('text')
      .classed('value', true);
  values.select('.name')
      .attr('x', x - 5)
      .attr('y', function (d, i) {
        return (i + 2.5) * self.lineHeight;
      });
  values.select('.value')
      .text(function (d) { return d; })
      .attr('x', x + 5)
      .attr('y', function (d, i) {
        return (i + 2.5) * self.lineHeight;
      });
};
