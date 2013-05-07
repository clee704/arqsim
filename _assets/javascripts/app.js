function App() {
  // objects
  this.clock = null;
  this.transmitter = null;
  this.receiver = null;
  this.system = null;
  this.painter = new Painter;

  // app states
  this.started = false;
  this.paused = false;
  this.simulationSpeed = 1;
  this.simulationTimeStep = 1;
  this.loopInterval = 1000;
  this.transitionDuration = 1000;
  this.message = 0;
  this.receivedMessages = [];
  this.timerId = null;

  this._init();
}

App.prototype.start = function () {
  clearTimeout(this.timerId);  // stop current timer (if present)
  this._createObjects();
  this.message = 0;
  this.receivedMessages = [];
  this.painter.setSystem(this.system);
  this.started = true;
  this._prepareLoop();
  this.pause(false);  // start loop
  $('#pause').show();
  $('#start').text('Start new');
};

App.prototype.pause = function (paused) {
  clearTimeout(this.timerId);  // stop current timer (if present)
  this.paused = paused;
  if (this.started && !this.paused) this._startLoop();
  $('#pause').html(this.paused ? 'Resume' : 'Pause');
};

App.prototype.getParameters = function () {
  return {
    protocol: $('#protocol option:selected').val(),
    w: this._getParameter('#w'),
    a: this._getParameter('#a'),
    p: this._getParameter('#p')
  };
};

App.prototype.setSimulationSpeed = function (value) {
  if (value < $('#simulation-speed-slider').slider('option', 'min') ||
      value > $('#simulation-speed-slider').slider('option', 'max')) {
    return;
  }
  var speed = Math.pow(10, value / 50);
  this.simulationSpeed = speed;
  this.simulationTimeStep = Math.ceil(speed / 60);
  this.loopInterval = 1000 * this.simulationTimeStep / speed;
  this.transitionDuration = this.simulationTimeStep == 1 ? this.loopInterval : 0;
  this.painter.setTransitionDuration(this.transitionDuration);
  $('#simulation-speed').html(speed.toFixed(1));
  $('#simulation-speed-slider').slider('value', value);
};

App.prototype._init = function () {
  this._bindListeners();
  this._updateControls();
};

App.prototype._bindListeners = function () {
  var self = this;
  $('#w, #a').change(function () {
    var params = self.getParameters();
    $('#rtt').text(params.a * 2 + 1);
  });
  $('#simulation-speed-slider').slider({
    value: 0,
    min: -50,
    max: 250,
    slide: function (e, ui) { self.setSimulationSpeed(ui.value); }
  });
  $('#start').click(function () {
    self.start();
    return false;
  });
  $('#pause').click(function () {
    self.pause(!self.paused);
    return false;
  });
  var resizeTimer,
      resizeCallback = function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          if (self.system === null) return;
          self.painter.resize();
          self.painter.draw(true);
        }, 250);
      };
  $(window).resize(resizeCallback);
  $('[data-toggle="collapse"]').click(resizeCallback);
};

App.prototype._updateControls = function () {
  this.setSimulationSpeed($('#simulation-speed-slider').slider('value'));
};

App.prototype._createObjects = function() {
  var self = this,
      params = this.getParameters();

  // Start the simulation at 1 second before operating
  this.clock = new Clock(-1, 13);
  this.clock.addEvent({
    time: 1 - this.clock.timeStep,
    interval: 1,
    func: function () { self._operate(); }
  });
  this.system = new System(params, this.clock);
  this.transmitter = this.system.node1;
  this.transmitter.setName('Transmitter');
  this.receiver = this.system.node2;
  this.receiver.setName('Receiver');
};

App.prototype._getParameter = function (selector) {
  var $elem = $(selector),
      param = Number($elem.val().replace(/[^0-9.]/g, '')),
      min = Number($elem.attr('min')),
      max = Number($elem.attr('max'));
  if (isNaN(param)) param = Number($elem.attr('value'));
  if ($elem.data('round')) param = Math.round(param);
  if (param < min) param = min;
  if (param > max) param = max;
  $elem.val(param);
  return param;
};

App.prototype._prepareLoop = function () {
  var loopStart = Date.now();
  this.clock.advance(this.simulationTimeStep);
  this.painter.draw();
  var loopEnd = Date.now();
  this.prevLoopEnd = (this.transitionDuration ? loopEnd : loopStart);
  this.prevLoopInterval = this.loopInterval;
};

App.prototype._startLoop = function () {
  var self = this,
      loopStart = Date.now();
  if (loopStart - this.prevLoopEnd >= this.prevLoopInterval) {
    this.clock.advance(this.simulationTimeStep);
    this.painter.draw();
    var loopEnd = Date.now();
    this.prevLoopEnd = (this.transitionDuration ? loopEnd : loopStart);
    this.prevLoopInterval = this.loopInterval;
  }
  if (this.paused) return;
  this.timerId = setTimeout(function () {
    if (!self.paused) self._startLoop();
  }, Math.max(this.prevLoopEnd + this.prevLoopInterval - Date.now(), 0));
};

// Mocks two nodes one sending increasing numbers to the other.
App.prototype._operate = function () {
  this.receivedMessages = this.receiver.recv();
  // Do something
  try {
    while (true) {
      this.transmitter.send(this.message);
      this.message++;
    }
  } catch (e) {
    // Transmitter may throw an error if its buffer is full
  }
};
