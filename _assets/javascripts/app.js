function App() {
  // objects
  this.clock = null;
  this.sender = null;
  this.receiver = null;
  this.system = null;

  // data
  this.dataseq = null;
  this.receivedData = null;

  // app states
  this.started = null;
  this.paused = null;
  this.simulationSpeed = null;

  // others
  this.painter = null;
  this.loopTimer = null;
  this.resultRow = null;
}

App.prototype.init = function () {
  this._bindListeners();
  this._updateDisplays();
};

App.prototype._bindListeners = function () {
  var self = this;
  $('#protocol, #w, #a, #p').change(function () {
    self._updateUtilization();
  });
  $('#framerate').change(function () { self.setFps($(this).val()); });
  $('#speed-slider').slider({
    value: 0,
    min: -50,
    max: 250,
    slide: function (e, ui) { self.setSimulationSpeed(ui.value); }
  });
  $('#start').click(function () {
    self.start();
    return false;
  });
  $('#parameters input').keydown(function (e) {
    var RETURN = 13;
    if (e.which === RETURN) self.start();
  });
  $('#pause').click(function () {
    self.pause(!self.paused);
    return false;
  });
};

App.prototype._updateDisplays = function () {
  this._updateUtilization();
  this.setSimulationSpeed($('#speed-slider').slider('value'));
};

App.prototype._updateUtilization = function () {
  var params = this.getParameters(),
      u = 0;
  if (params.protocol == 'gbn') {
    if (params.w >= 1 + 2 * params.a) {
      u = (1 - params.p) / (1 + 2 * params.a * params.p);
    } else {
      u = params.w * (1 - params.p) /
          ((1 + 2 * params.a) * (1 - params.p + params.w * params.p));
    }
  } else {
    // TODO
  }
  $('#u').text(u);
};

App.prototype.start = function () {
  clearTimeout(this.loopTimer);
  this._createObjects();
  this.dataseq = 1;
  this.receivedData = [];

  this.painter = new Painter(this.system, this.receivedData);
  this.painter.init();

  this._newResultRow();
  this.started = true;
  this.pause(false);
  $('#pause').show();
  $('#start').text('Start new');

  var self = this;
  setInterval(function () { self._updateResultsTable(); }, 1000);
};

App.prototype._createObjects = function() {
  var self = this,
      params = this.getParameters();

  // start the simulation at 1 second before operating
  this.clock = new Clock(-1, 13);
  this.clock.addEvent({
    time: this.clock.dtMin,
    interval: 1,
    func: function () { self._operate(); }
  });
  if (params.protocol == 'gbn') {
    this.sender = new GbnNode(params.w, params.a);
    this.receiver = new GbnNode(params.w, params.a);
  } else {
    this.sender = new SrNode(params.w, params.a);
    this.receiver = new SrNode(params.w, params.a);
  }
  this.system = new System(params.a, params.p, this.sender, this.receiver);
  this.system.setClock(this.clock);
};

App.prototype.pause = function (paused) {
  this.paused = paused;
  if (this.started && !this.paused) this._startLoop();
  $('#pause').html(this.paused ? 'Resume' : 'Pause');
};

App.prototype.getParameters = function () {
  return {
    protocol: $('#protocol option:selected').val(),
    w: this._getParameter($('#w'), true),
    a: this._getParameter($('#a'), true),
    p: this._getParameter($('#p'))
  };
};

App.prototype._getParameter = function ($elem, round) {
  var param = Number($elem.val().replace(/[^0-9.]/g, '')),
      min = Number($elem.attr('min')),
      max = Number($elem.attr('max'));
  if (isNaN(param)) param = Number($elem.attr('value'));
  if (round) param = Math.round(param);
  if (param < min) param = min;
  if (param > max) param = max;
  $elem.val(param);
  return param;
};

App.prototype.setFps = function (value) {
  if ($('#framerate option[value=' + value + ']').length == 0) return;
  this.painter.setFps(value);
  $('#framerate').val(value);
};

App.prototype.setSimulationSpeed = function (value) {
  if (value < $('#speed-slider').slider('option', 'min') ||
      value > $('#speed-slider').slider('option', 'max')) {
    return;
  }
  this.simulationSpeed = Math.pow(10, value / 50);
  $('#speed-value').html(this.simulationSpeed.toFixed(1));
  $('#speed-slider').slider('value', value);
};

// Call this._tick() this.painter.fps times per second.
// If the computation is too heavy (usually due to too high simulation speed),
// this._tick() may exceed the time it was assigned
// (1 / this.painter.fps seconds). In that case, both frame rate and simulation
// speed can be lower than user-specified value.
App.prototype._startLoop = function () {
  var self = this,
      currentLoopTime = Date.now();
  this._tick();
  this.loopTimer = setTimeout(function () {
    if (!self.paused) self._startLoop();
  }, Math.max(0, 1000 / this.painter.fps - Date.now() + currentLoopTime));
};

App.prototype._tick = function () {
  try {
    this.clock.advance(this.simulationSpeed / this.painter.fps);
  } catch (ex) {
    alert(ex);
    throw ex;  // brutal way to stop the loop
  }
  this.painter.drawAll();
};

// Implicitly called by this.clock.advance() in this._tick().
// It mocks two nodes one sending increasing numbers every second to the other.
App.prototype._operate = function () {
  this.receivedData = this.receiver.recv();
  // do something
  try {
    this.sender.send('#' + this.dataseq);
    this.dataseq++;
  } catch (e) {
    // sender may throw an error if its buffer is full
  }
};

App.prototype._newResultRow = function () {
  var tmpl = '<tr class="current">' +
      '<td class="Protocol"></td>' +
      '<td class="w"></td>' +
      '<td class="T"></td>' +
      '<td class="a"></td>' +
      '<td class="P"></td>' +
      '<td class="U"></td>' +
      '<td class="t"></td>' +
      '</tr>';
  $('#results tbody td.empty').remove();
  $('#results tbody tr.current').removeClass('current');
  this.resultRow = $(tmpl).prependTo($('#results tbody'));
};

App.prototype._updateResultsTable = function () {
  var protocol = this.sender.constructor == GbnNode ? 'GBN' : 'SR',
      p = this.system.link1.currentFrameErrorRate(),
      u = this.receiver.currentUtilization();
  this.resultRow.find('.Protocol').text(protocol);
  this.resultRow.find('.w').text(this.sender.w);
  this.resultRow.find('.T').text(this.sender.txtimeout);
  this.resultRow.find('.a').text(this.sender.a);
  this.resultRow.find('.P').text(p.toFixed(6));
  this.resultRow.find('.U').text(u.toFixed(4));
  this.resultRow.find('.t').text(this.clock.currentTime.toPrecision(2));
};
