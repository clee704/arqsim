/**
 * Clock is actually an event manager. You can add events, or callbacks,
 * to be called later at the specified time. You can also make those
 * events periodic.
 *
 * If currentTime is specified, it is used to set the initial time of
 * the clock (0 by default). prec determines the precision of the time
 * value. To avoid unexpected results when {@link Clock#advance} is called
 * many times, time is treated as if it is a discrete value with the minimum
 * step of 1/(2^prec). The minimum allowed value of prec is 10, which is
 * also the default value.
 *
 * Note that there is an upper bound on the time value. Since it is just
 * an ordinary JavaScript number variable, the maximum is 2^53 time
 * steps. So if prec is 10, the maximum time is 2^43.
 */
function Clock(currentTime, prec) {
  /** Precision of the time value so that timeStep is 1/(2^prec) */
  prec = Math.floor(prec || 10);
  if (prec < 10) {
    throw 'prec must >= 10';
  }
  /** Minimum difference between any two time values */
  this.timeStep = 1 / Math.pow(2, prec);
  /** Current time */
  this.currentTime = Math.floor((currentTime || 0) / this.timeStep) * this.timeStep;
  /** Time limit */
  this.timeMax = Math.pow(2, 53) * this.timeStep;

  this._nextEventId = 0;  // auto-incrementing id for each event
  this._events = new Heap(function (ev) { return ev.time; });
}

/**
 * Move the time of this clock forward by the specified amount.
 * Event callbacks will be invoked in order if they are set to occur
 * between the current time and the time after the specified amount passed.
 *
 * Note that the specified amount is quantized by {@link Clock#timeStep}.
 */
Clock.prototype.advance = function (amount) {
  var events = this._events,
      currentTime = this.currentTime,
      timeStep = this.timeStep,
      ticks = Math.floor(amount / timeStep),
      dt = timeStep * ticks,
      endTime = currentTime + dt,
      ev,
      time;
  if (currentTime >= this.timeMax - dt) {
    throw 'maximum simulation time reached';
  }
  while ((ev = events.peek()) && (time = ev.time) <= endTime) {
    ev = events.pop();
    var id = ev.id,
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

/**
 * Set the time of this clock to the specified time. The time
 * must be larger than {@link Clock#currentTime}.
 *
 * This method is a wrapper on {@link Clock#advance} and intended
 * to be used in tests. For normal uses, use {@link Clock#advance}
 * instead.
 */
Clock.prototype.setTime = function (time) {
  var amount = time - this.currentTime;
  if (amount < 0) throw 'cannot go back to the past';
  this.advance(amount);
};

/**
 * Add an event to this clock. args is an object with the following
 * properties: time, interval, func, obj, and args.
 *
 * time is relative to current time. interval makes the event periodic,
 * if it is a positive number. func, obj, and args are used to invoke
 * the callback; it is called as func.apply(obj, args).
 *
 * Use multiples of {@link Clock#timeStep} for time and interval values
 * for consistent order of execution of events.
 */
Clock.prototype.addEvent = function (args) {
  var time = args.time,
      interval = args.interval,
      func = args.func,
      obj = args.obj,
      args = args.args;
  if (time < this.currentTime) {
    throw 'cannot add an event in the past';
  }
  var id = this._nextEventId++;
  this._events.push({
    id: id,
    time: time + this.currentTime,
    interval: interval,
    func: func,
    obj: obj,
    args: args
  });
  return id;
};
