function Node(params, clock, txlink, rxlink) {
  /** Window size */
  this.w = params.w;
  this.rxstats = {
    status: 'ready',
    acceptedFrames: 0,
    erroneousFrames: 0,
    totalFrames: 0
  };
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
 * Returns the current utilization as seen by a receiver.
 */
Node.prototype.currentUtilization = function () {
  return this.rxstats.acceptedFrames /
      Math.max(1, Math.floor(this.clock.currentTime - this.rxlink.a));
};

/**
 * Returns the current block error rate of the rxlink as seen by a receiver.
 */
Node.prototype.currentBlockErrorRate = function () {
  var rxstats = this.rxstats;
  return rxstats.erroneousFrames / Math.max(1, rxstats.totalFrames);
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
  this.rxwin = 1;
  this.rxbuf = new CircularBuffer(1);
  this.rxbase = 0;  // sequence number of the next frame to receive

  this.txmsgid = 0;
  this.rxmsgid = 0;
  this.messages = [];

  this._fillRxBuffer();
}
GbnNode.prototype = Object.create(Node.prototype);
GbnNode.prototype.constructor = GbnNode;

GbnNode.prototype._fillRxBuffer = function () {
  this.rxbuf.push([this.rxmsgid++, null]);
};

GbnNode.prototype.send = function (message) {
  var txuser = this.txuser;
  if (txuser >= this.txbuf.capacity) {
    throw 'buffer full';
  } else {
    this.txbuf.push([this.txmsgid++, message]);
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
    this.txlink.write({type: 'I', sn: txnext, msg: this.txbuf.get(i)[1]});
    this.txnext = (txnext + 1) % s;
  }
};

GbnNode.prototype._recvS = function (frame) {
  var s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      sn = frame.sn,
      i = (sn - txbase + s) % s;
  if (sn !== txbase) return;  // ignore invalid SN
  if (frame.func === 'ACK') {
    // Frame SN is acknowledged.
    txbuf.get(0)[1] = null;
    // Remove the message for the acknowledged frame from buffer.
    this.txbase = (txbase + 1) % s;
    this.txuser--;
    txbuf.pop();
  } else {  // frame.func == 'NAK'
    // Start over the transmission from the frame whose sequence number is sn
    this.txnext = sn;
  }
};

GbnNode.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.rxstats.status = 'ready';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

GbnNode.prototype._recvI = function (frame) {
  var rxstats = this.rxstats,
      sn = frame.sn;
  rxstats.status = 'discard';
  rxstats.totalFrames++;
  if (frame.error) rxstats.erroneousFrames++;
  if (sn !== this.rxbase) return;
  if (frame.error || this.rxbuf.get(0)[1] !== null) {
    rxstats.status = 'error';
    this.txlink.write({type: 'S', func: 'NAK', sn: sn});
  } else {
    rxstats.status = 'accept';
    rxstats.acceptedFrames++;
    this.rxbuf.get(0)[1] = frame.msg;
    this._flush();
    this.txlink.write({type: 'S', func: 'ACK', sn: sn});
  }
};

GbnNode.prototype._flush = function () {
  this.messages.push(this.rxbuf.push([this.rxmsgid++, null])[1]);
  this.rxbase = (this.rxbase + 1) % this.s;
};

GbnNode.prototype.recv = function () {
  return this.messages.splice(0, this.messages.length);
};


function SrNode(params, clock, txlink, rxlink) {
  Node.call(this, params, clock, txlink, rxlink);
  // maximum sequence number
  this.s = 1 << Math.ceil(Math.log(params.w * 2) / Math.log(2));
  this.txbuf = new CircularBuffer(params.w * 2);
  this.txbase = 0;  // sequence number of the first unacknowledged frame
  this.txnakd = null;  // sequence number of the frame to be resent
  this.txnext = 0;  // sequence number of the first unsent frame
  this.txuser = 0;  // index of the first available slot in txbuf
  this.rxwin = params.w;
  this.rxbuf = new CircularBuffer(params.w);
  this.rxbase = 0;  // sequence number of the first NAKed frame

  this.txmsgid = 0;
  this.rxmsgid = 0;
  this.messages = [];

  this._fillRxBuffer();
}
SrNode.prototype = Object.create(Node.prototype);
SrNode.prototype.constructor = SrNode;

SrNode.prototype._fillRxBuffer = function () {
  for (var i = 0; i < this.rxbuf.capacity; i++) {
    this.rxbuf.push([this.rxmsgid++, null]);
  }
};

SrNode.prototype.send = function (message) {
  var txuser = this.txuser;
  if (txuser >= this.txbuf.capacity) {
    throw 'buffer full';
  } else {
    this.txbuf.push([this.txmsgid++, message]);
    this.txuser++;
  }
};

SrNode.prototype._send = function () {
  var s = this.s,
      txnakd = this.txnakd,
      txnext = this.txnext,
      resending = txnakd !== null,
      sn = resending ? txnakd : txnext,
      i = (sn - this.txbase + s) % s;
  if (i < this.txuser && i < this.w) {
    // i < this.txuser: true if there is an unsent message
    // i < this.w: true if the window is not full
    this.txlink.write({type: 'I', sn: sn, msg: this.txbuf.get(i)[1]});
    if (resending) {
      this.txnakd = null;
    } else {
      this.txnext = (txnext + 1) % s;
    }
  }
};

SrNode.prototype._recvS = function (frame) {
  var s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      txuser = this.txuser,
      sn = frame.sn,
      i = (sn - txbase + s) % s;
  if (i >= this.w) return;  // ignore invalid SN
  if (frame.func === 'ACK') {
    // Frame SN is acknowledged.
    txbuf.get(i)[1] = null;
    // Remove the messages for the acknowledged frames from buffer.
    while (txbuf.get(0)[1] === null) {
      txbase++;
      txuser--;
      txbuf.pop();
    }
    this.txbase = txbase % s;
    this.txuser = txuser;
  } else {  // frame.func == 'NAK'
    // Resend the frame whose sequence number is sn
    this.txnakd = sn;
  }
};

SrNode.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.rxstats.status = 'ready';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

SrNode.prototype._recvI = function (frame) {
  var rxstats = this.rxstats,
      w = this.w,
      s = this.s,
      sn = frame.sn,
      i = (sn - this.rxbase + s) % s;
  rxstats.status = 'discard';
  rxstats.totalFrames++;
  if (frame.error) rxstats.erroneousFrames++;
  if (i > w) return;  // ignore invalid SN
  // i == w is the case when the user didn't call SrNode#recv and
  // rxbuf is full
  if (frame.error || i == w || this.rxbuf.get(i)[1] !== null) {
    rxstats.status = 'error';
    this.txlink.write({type: 'S', func: 'NAK', sn: sn});
  } else {
    rxstats.status = 'accept';
    rxstats.acceptedFrames++;
    this.rxbuf.get(i)[1] = frame.msg;
    this._flush();
    this.txlink.write({type: 'S', func: 'ACK', sn: sn});
  }
};

SrNode.prototype._flush = function () {
  var rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      messages = this.messages;
  while (rxbuf.get(0)[1] !== null) {
    messages.push(rxbuf.push([this.rxmsgid++, null])[1]);
    rxbase++;
  }
  this.rxbase = rxbase % this.s;
};

SrNode.prototype.recv = function () {
  return this.messages.splice(0, this.messages.length);
};
