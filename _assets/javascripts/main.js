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
var painter;

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
  painter = new Painter(system, receivedData);
  painter.init();
  painter.drawBackground();
  painter.drawNodes();

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
    clock.advance(targetSimSpeed / painter.fps);
  } catch (ex) {
    alert(ex);
    throw ex;  // brutal way to stop the loop
  }
  painter.drawBackground();
  painter.drawPrimaryLink();
  painter.drawSecondaryLink();
  painter.drawSenderWindow();
  painter.drawReceiverWindow();
  painter.drawNodes();
  painter.drawStatistics();
}

function startLoop() {
  var currentLoopTime = Date.now();
  tick();
  loopTimer = setTimeout(function () {
    if (!paused)
      startLoop();
  }, Math.max(0, 1000 / painter.fps - Date.now() + currentLoopTime));
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

$(function () {
  // if the browser supports <canvas> tag
  if (!!document.createElement('canvas').getContext) {
    $('#parameters input').keydown(function (e) { if (e.which === 13) start(); });
    $('#start').click(start);
    $('#pause').click(pause);
    $('[name=protocol], #w, #a, #p').change(computeUtilization);
    computeUtilization();
    $('#framerate').change(function () { painter.setFps($(this).val()); });
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
