function Clock(currentTime, prec) {
  prec = Math.floor(prec);
  if (prec < 10) {
    throw 'prec must >= 10';
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
    throw 'maximum simulation time reached';
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

Clock.prototype.setTime = function (time) {
  var dtRaw = time - this.currentTime;
  if (dtRaw < 0) throw 'cannot go back to the past';
  this.advance(dtRaw);
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
    throw 'cannot add an event in the past';
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
