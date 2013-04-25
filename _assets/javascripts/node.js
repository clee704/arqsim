function Node(w, a) {
  this.w = w;  // window size
  this.a = a;  // ratio of propagation delay relative to transmission time
  this.txbuf = new CircularBuffer(w);
  this.txbase = 0;
  this.txnext = 0;  // sequence number of the first unsent frame
  this.txuser = 0;  // index of the first available slot in txbuf
  this.rxbase = 0;
  this.rxuser = 0;  // index + 1 of the last received frame in rxbuf
  this.stats = {rx: 'ready', rxiframes: 0};

  // follwing variables must be set before using this instance
  this.clock = null;
  this.txlink = null;
  this.rxlink = null;

  // following variables must be defined in a subclass
  this.s = null;  // # of sequence numbers
  this.txtimers = null;
  this.rxbuf = null;

  // following methods must be implemented in a subclass
  // _recvI, _recvS, _checkTimeout, _setTimer
}

Node.prototype.setClock = function (clock) {
  var self = this;
  this.clock = clock;
  this.clock.addEvent({
    time: 1,
    interval: 1,
    func: function () { self._operate(); }
  });
};

Node.prototype.setLinks = function (txlink, rxlink) {
  this.txlink = txlink;
  this.rxlink = rxlink;
};

Node.prototype.send = function (data) {
  var w = this.w,
      i = this.txuser;
  if (!this.txlink) {
    throw new Error('link not connected');
  }
  if (i === w) {
    throw new Error('buffer full');
  } else {
    assert(i < w);
    this.txbuf.set(i, data);
    this.txuser++;
  }
};

Node.prototype.recv = function () {
  var rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      data = [];
  while (rxbuf.get(0) !== undefined) {
    data.push(rxbuf.push());
    rxbase++;
    rxuser--;
  }
  this.rxbase = rxbase % this.s;
  this.rxuser = rxuser;
  return data;
};

Node.prototype.currentUtilization = function () {
  return this.stats.rxiframes /
      Math.max(1, Math.floor(this.clock.currentTime - this.a));
};

Node.prototype._operate = function () {
  this._checkTimeout();
  this._recv();
  this._send();
};

Node.prototype._recv = function () {
  var frame = this.rxlink.read();
  if (!frame) {
    this.stats.rx = 'ready';
  } else if (frame.error) {
    this.stats.rx = 'error';
  } else if (frame.type === 'I') {
    this._recvI(frame);
  } else if (frame.type === 'S') {
    this._recvS(frame);
  } else {
    // unrecognizable frame
  }
};

Node.prototype._send = function () {
  var s = this.s,
      sn = this.txnext,
      i = (sn - this.txbase + s) % s;
  if (i < this.txuser) {
    this.txlink.write({type: 'I', sn: sn, data: this.txbuf.get(i)});
    this.txnext = (sn + 1) % s;
    this._setTimer(this.clock.currentTime, sn, i);
  }
};


function GbnNode(w, a) {
  Node.call(this, w, a);
  // # of sequence numbers
  this.s = 1 << Math.ceil(Math.log(w + 1) / Math.log(2));
  this.txtimers = new CircularBuffer(w);
  this.txtimeout = a * 2 + 2;
  this.rxbuf = new CircularBuffer(1);  // dummy
  this.rxrejd = false;  // needed to send REJ only once per go-back
}
GbnNode.prototype = new Node;
GbnNode.prototype.constructor = GbnNode;

GbnNode.prototype._recvI = function (frame) {
  var s = this.s,
      rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      i = (frame.sn - rxbase + s) % s;
  this.stats.rx = 'discard';
  if (i === rxuser && rxbuf.get(i) === undefined) {
    rxbuf.set(i, frame.data);
    rxuser++;
    this.rxuser = rxuser;
    this.rxrejd = false;
    this.stats.rx = 'accept';
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: (rxbase + rxuser) % s});
  } else if (i < this.w && !this.rxrejd) {
    this.rxrejd = true;
    this.txlink.write({type: 'S', func: 'REJ', rn: (rxbase + rxuser) % s});
  }
};

GbnNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      txtimers = this.txtimers,
      rn = frame.rn,
      i = (rn - txbase + s) % s,
      j = (this.txnext - txbase + s) % s;
  if (i > 0 && i <= w) {
    this.txbase = (txbase + i) % s;
    this.txuser -= i;
    while (i-- > 0) {
      txbuf.push();
      txtimers.push();
    }
  }
  if (frame.func === 'REJ' && i < j) {
    this.txnext = rn;
  }
};

GbnNode.prototype._checkTimeout = function () {
  if (this.clock.currentTime - this.txtimers.get(0) >= this.txtimeout)
    this.txnext = this.txbase;
};

GbnNode.prototype._setTimer = function (currentTime, sn, i) {
  this.txtimers.set(i, currentTime);
};


/*function SrNode(w, a) {
  Node.call(this, w, a);
  this.s = 1 << Math.ceil(Math.log(w * 2) / Math.log(2)); // # of sequence numbers
  this.rxbuf = new CircularBuffer(w);
  this.rxlast = -1; // index of the last received frame in rxbuf
  this.rxrejd = false; // needed to send REJ only once per go-back
}
SrNode.prototype = new Node;
SrNode.prototype.constructor = SrNode;

SrNode.prototype._recvI = function (frame) {
  var s = this.s,
      rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      i = (frame.sn - rxbase + s) % s;
  if (i === rxuser && rxbuf.get(i) === undefined) {
    rxbuf.set(i, frame.data);
    rxuser++;
    this.rxuser = rxuser;
    this.rxrejd = false;
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: (rxbase + rxuser) % s});
  } else if (i < this.w && !this.rxrejd) {
    this.rxrejd = true;
    this.txlink.write({type: 'S', func: 'REJ', rn: (rxbase + rxuser) % s});
  }
};

SrNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      rn = frame.rn,
      i = (rn - txbase + s) % s,
      j = (this.txnext - txbase + s) % s;
  if (i > 0 && i <= w) {
    this.txbase = (txbase + i) % s;
    if (this.txuser === w) {
      txbuf.push(this.txextra);
      this.txextra = null;
      i--;
    }
    this.txuser -= i;
    while (i-- > 0) {
      txbuf.push();
    }
  }
  if (frame.func === 'REJ' && i < j) {
    this.txnext = rn;
  }
};

SrNode.prototype._checkTimeout = function () {
  // todo
};

SrNode.prototype._setTimer = function (currentTime, sn, i) {
  // todo
};*/
