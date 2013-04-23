function Link(a, p) {
  this.a = a; // ratio of propagation delay relative to transmission time
  this.p = p; // frame error rate for txqueue
  this.queue = [];
  this.stats = {errors: 0, total: 0};
}

Link.prototype.setClock = function (clock) {
  this.clock = clock;
};

Link.prototype.write = function (frame) {
  var stats = this.stats,
      time = this.clock.currentTime,
      i,
      queue = this.queue,
      n = queue.length;
  if (frame.type === 'I') {
    frame.time = time + 1;
    if (Math.random() < this.p) {
      frame.error = 1;
    }
    queue.push(frame);
  } else {
    // put the frame in the queue at the right position
    frame.time = time;
    if (n === 0 || queue[n - 1].time < time) {
      queue.push(frame);
    } else {
      for (i = n - 2; i >= 0; i--) {
        if (queue[i].time < time) {
          break;
        }
      }
      queue.splice(i + 1, 0, frame);
    }
  }
  if (frame.error) {
    stats.errors++;
  }
  stats.total++;
};

Link.prototype.read = function () {
  var a = this.a,
      queue = this.queue,
      currentTime = this.clock.currentTime,
      i,
      n = this.queue.length,
      ret;
  for (i = 0; i < n; ++i) {
    if (currentTime - queue[i].time < a) {
      break;
    }
  }
  if (i === 0) {
    return;
  }
  ret = queue[i - 1];
  queue.splice(0, i);
  return ret;
};
