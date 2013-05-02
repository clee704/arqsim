function Node(params, clock, txlink, rxlink) {
  /** Window size */
  this.w = params.w;
  this.stats = {rx: 'ready', rxiframes: 0};
  this.name = null;

  this.clock = clock;
  this.txlink = txlink;
  this.rxlink = rxlink;

  this._init();
}

/**
 * Writes a message to the transmission link.
 * message should be string or number.
 */
Node.prototype.send = function (message) {
  throw 'not implemented';
};

/**
 * Reads messages from the reception link and returns them as an array.
 *
 * If you don't read messages from a node, the reception queue may become
 * full and then the node cannot accept a new message from the other node.
 */
Node.prototype.recv = function () {
  throw 'not implemented';
};

/**
 * Sets the name of this node.
 */
Node.prototype.setName = function (name) {
  this.name = name;
};

/**
 * Returns the utilization as seen by a receiver.
 */
Node.prototype.currentUtilization = function () {
  return this.stats.rxiframes /
      Math.max(1, Math.floor(this.clock.currentTime - this.rxlink.a));
};

Node.prototype._init = function () {
  var self = this;
  this.clock.addEvent({
    time: 1,
    interval: 1,
    func: function () { self._operate(); }
  });
};

Node.prototype._operate = function () {
  this._recv();
  this._send();
};

Node.prototype._recv = function () {
  throw 'not implemented';
};

Node.prototype._send = function () {
  throw 'not implemented';
};


function GbnNode(params, clock, txlink, rxlink) {
  Node.call(this, params, clock, txlink, rxlink);
  // maximum sequence number
  this.s = 1 << Math.ceil(Math.log(params.w + 1) / Math.log(2));
  this.txbuf = new CircularBuffer(params.w + 1);
  this.txbase = 0;  // sequence number of the first unacknowledged frame
  this.txnext = 0;  // sequence number of the first unsent frame
  this.txuser = 0;  // index of the first available slot in txbuf
  this.rxnext = 0;  // sequence number of the next frame to receive
  this.rxbuf = null;
}
GbnNode.prototype = Object.create(Node.prototype);
GbnNode.prototype.constructor = GbnNode;

GbnNode.prototype.send = function (message) {
  var w = this.w,
      txuser = this.txuser;
  if (txuser >= w + 1) {
    throw 'buffer full';
  } else {
    this.txbuf.set(txuser, message);
    this.txuser++;
  }
};

GbnNode.prototype._send = function () {
  var s = this.s,
      txnext = this.txnext,
      i = (txnext - this.txbase + s) % s;
  if (i < this.txuser && i < this.w) {
    // i < this.txuser: true if there is an unsent message
    // i < this.w: true if the window is not full
    this.txlink.write({type: 'I', sn: txnext, data: this.txbuf.get(i)});
    this.txnext = (txnext + 1) % s;
  }
};

GbnNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      rn = frame.rn,
      i = (rn - txbase + s) % s;
  if (rn !== txbase) return;  // ignore invalid RN
  if (frame.func === 'RR') {
    // All frames with sequence number <= rn are acknowledged.
    // Remove messages for acknowledged frames from buffer.
    this.txbase = (txbase + 1) % s;
    this.txuser--;
    txbuf.push();
  }
  if (frame.func === 'REJ') {
    // Start over the transmission from the frame whose sequence number is rn
    this.txnext = rn;
  }
};

GbnNode.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.stats.rx = 'ready';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

GbnNode.prototype._recvI = function (frame) {
  var sn = frame.sn;
  this.stats.rx = 'discard';
  if (sn !== this.rxnext) return;
  if (frame.error) {
    this.stats.rx = 'error';
    this.txlink.write({type: 'S', func: 'REJ', rn: sn});
  } else if (this.rxbuf === null) {
    this.rxbuf = frame.data;
    this.rxnext = (sn + 1) % this.s;
    this.stats.rx = 'accept';
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: sn});
  }
};

GbnNode.prototype.recv = function () {
  var message = this.rxbuf;
  if (message === null) {
    return [];
  } else {
    var ret = [message];
    this.rxbuf = null;
    return ret;
  }
};


function SrNode(params, clock, txlink, rxlink) {
  Node.call(this, params, clock, txlink, rxlink);
  // maximum sequence number
  this.s = 1 << Math.ceil(Math.log(params.w * 2) / Math.log(2));
  this.txbuf = new CircularBuffer(params.w + 1);
  // acknowledgement status flags
  this.txack = new CircularBuffer(params.w);
  this.txbase = 0;  // sequence number of the first unacknowledged frame
  this.txnext = 0;  // sequence number of the first unsent frame
  this.txnakd = null;  // sequence number of the frame to be resent
  this.txuser = 0;  // index of the first available slot in txbuf
  this.rxbase = 0;  // sequence number of the first NAKed frame
  this.rxbuf = new CircularBuffer(params.w);
}
SrNode.prototype = Object.create(Node.prototype);
SrNode.prototype.constructor = SrNode;

SrNode.prototype.send = function (message) {
  var txuser = this.txuser;
  if (txuser >= this.w + 1) {
    throw 'buffer full';
  } else {
    this.txbuf.set(txuser, message);
    this.txuser++;
  }
};

SrNode.prototype._send = function () {
  var txnext = this.txnext,
      txnakd = this.txnakd,
      resending = txnakd !== null,
      sn = resending ? txnakd : txnext,
      i = (sn - this.txbase + this.s) % this.s;
  if (i < this.txuser && i < this.w) {
    // i < this.txuser: true if there is an unsent message
    // i < this.w: true if the window is not full
    this.txlink.write({type: 'I', sn: sn, data: this.txbuf.get(i)});
    if (resending) {
      this.txnakd = null;
    } else {
      this.txnext = (txnext + 1) % this.s;
    }
  }
};

SrNode.prototype._recvS = function (frame) {
  var s = this.s,
      txbuf = this.txbuf,
      txack = this.txack,
      txbase = this.txbase,
      txuser = this.txuser,
      rn = frame.rn,
      i = (rn - txbase + s) % s;
  if (i >= this.w) return;  // ignore invalid RN
  if (frame.func === 'RR') {
    // Frame RN is acknowledged.
    txack.set(i, true);
    // Remove messages for acknowledged frames from buffer.
    while (txack.get(0)) {
      txbase++;
      txuser--;
      txbuf.push();
      txack.push();
    }
    this.txbase = txbase % s;
    this.txuser = txuser;
  } else {  // frame.func == 'REJ'
    // Start over the transmission from the frame whose sequence number is rn
    this.txnakd = rn;
  }
};

SrNode.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.stats.rx = 'ready';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

SrNode.prototype._recvI = function (frame) {
  var stats = this.stats,
      s = this.s,
      sn = frame.sn,
      i = (sn - this.rxbase + s) % s;
  stats.rx = 'discard';
  if (i > this.w) return;  // ignore invalid SN
  if (frame.error) {
    stats.rx = 'error';
    this.txlink.write({type: 'S', func: 'REJ', rn: sn});
  } else if (this.rxbuf.get(i) === undefined) {
    this.rxbuf.set(i, frame.data);
    stats.rx = 'accept';
    stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: sn});
  }
};

SrNode.prototype.recv = function () {
  var rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      messages = [];
  while (rxbuf.get(0) !== undefined) {
    messages.push(rxbuf.push());
    rxbase++;
  }
  this.rxbase = rxbase % this.s;
  return messages;
};
