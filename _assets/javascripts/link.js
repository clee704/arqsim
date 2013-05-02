/**
 * Single-duplex link between two nodes. Two parameters determine
 * the characteristics of this link: a and p.
 *
 * a is the propagation time (when packet length is 1).
 * p is the (target) block error rate. Errors occur in independently and
 * identically distributed manner.
 */
function Link(params, clock) {
  /** Propagation time */
  this.a = params.a;
  /** Block error rate */
  this.p = params.p;
  /** Statistics for this link */
  this.stats = {errors: 0, total: 0};

  this.queue = [];
  this.clock = clock;
}

/**
 * Puts a frame on this link. frame is an object with at least one property:
 * type.
 *
 * type is either 'I' or 'S'. If it is 'I', then the frame will be available
 * for read after propagation time + 1. Otherwise it takes only the propagation
 * time.
 *
 * frame should not have properties named time and error,
 * as those may be overwritten.
 */
Link.prototype.write = function (frame) {
  var stats = this.stats,
      time = this.clock.currentTime,
      queue = this.queue;
  if (frame.type === 'I') {
    frame.time = time + 1;  // +1 for packet length
    // Make errors with probability p
    if (Math.random() < this.p) frame.error = 1;
    queue.push(frame);
  } else {
    // Insert the frame in the queue at the right position
    var n = queue.length;
    frame.time = time;
    if (n == 0 || queue[n - 1].time < time) {
      // Current frame has the largest time value
      queue.push(frame);
    } else {
      // Find the position where the frame will be inserted
      for (var i = n - 2; i >= 0; i--) {
        if (queue[i].time < time) break;
      }
      queue.splice(i + 1, 0, frame);
    }
  }
  if (frame.error) stats.errors++;
  stats.total++;
};

/**
 * Removes and returns all frames available for read from this link.
 */
Link.prototype.read = function () {
  var a = this.a,
      queue = this.queue,
      currentTime = this.clock.currentTime,
      n = this.queue.length;
  for (var i = 0; i < n; ++i) {
    if (currentTime - queue[i].time < a) {
      break;
    }
  }
  if (i == 0) return;  // No frames are available
  var ret = queue[i - 1];
  queue.splice(0, i);
  return ret;
};

/**
 * Returns computed block error rate of this link so far.
 */
Link.prototype.currentBlockErrorRate = function () {
  return this.stats.errors / Math.max(1, this.stats.total);
};
