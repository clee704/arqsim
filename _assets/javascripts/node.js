function Node(params) {
  if (params === undefined) params = {};
  this.w = params.w;  // window size
  this.a = params.a;  // ratio of propagation delay relative to transmission time
  this.stats = {rx: 'ready', rxiframes: 0};
  this.name = null;

  // follwing variables must be set before using this instance
  this.clock = null;
  this.txlink = null;
  this.rxlink = null;
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

Node.prototype.setName = function (name) {
  this.name = name;
};

Node.prototype.currentUtilization = function () {
  return this.stats.rxiframes /
      Math.max(1, Math.floor(this.clock.currentTime - this.a));
};

Node.prototype._operate = function () {
  this._recv();
  this._send();
};


function GbnNode(params) {
  Node.call(this, params);
  this.txbuf = new CircularBuffer(params.w);
  this.txextra = null;  // extra buffer
  this.txbase = 0;
  this.txnext = 0;  // sequence number of the first unsent frame
  this.txuser = 0;  // index of the first available slot in txbuf
  this.rxbase = 0;
  this.rxuser = 0;  // index + 1 of the last received frame in rxbuf
  this.s = 1 << Math.ceil(Math.log(params.w + 1) / Math.log(2));
  this.rxbuf = new CircularBuffer(1);  // dummy
}
GbnNode.prototype = new Node;
GbnNode.prototype.constructor = GbnNode;

GbnNode.prototype.send = function (data) {
  var w = this.w,
      i = this.txuser;
  if (i === w && this.txextra !== null) throw 'buffer full';
  if (!this.txlink) {
    throw 'link not connected';
  }
  if (i < w) {
    this.txbuf.set(i, data);
    this.txuser++;
  } else {
    this.txextra = data;
  }
};

GbnNode.prototype._send = function () {
  var s = this.s,
      sn = this.txnext,
      i = (sn - this.txbase + s) % s;
  if (i < this.txuser) {
    this.txlink.write({type: 'I', sn: sn, data: this.txbuf.get(i)});
    this.txnext = (sn + 1) % s;
  }
};

GbnNode.prototype.recv = function () {
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
  var s = this.s,
      rxbuf = this.rxbuf,
      rxbase = this.rxbase,
      rxuser = this.rxuser,
      i = (frame.sn - rxbase + s) % s;
  this.stats.rx = 'discard';
  if (i !== rxuser) return;
  if (frame.error) {
    this.stats.rx = 'error';
    this.txlink.write({type: 'S', func: 'REJ', rn: (rxbase + rxuser) % s});
  } else if (rxbuf.get(i) === undefined) {
    rxbuf.set(i, frame.data);
    rxuser++;
    this.rxuser = rxuser;
    this.stats.rx = 'accept';
    this.stats.rxiframes++;
    this.txlink.write({type: 'S', func: 'RR', rn: (rxbase + rxuser) % s});
  }
};

GbnNode.prototype._recvS = function (frame) {
  var w = this.w,
      s = this.s,
      txbuf = this.txbuf,
      txbase = this.txbase,
      rn = frame.rn,
      i = (rn - txbase + s) % s,
      j = (this.txnext - txbase + s) % s;
  if (i > 0 && i <= w) {
    this.txbase = (txbase + i) % s;
    if (this.txuser === w && this.txextra !== null) {
      txbuf.push(this.txextra);
      this.txextra = null;
      i--;
    }
    this.txuser -= i;
    while (i-- > 0) {
      txbuf.push();
    }
  }
  if (frame.func === 'REJ') {
    this.txnext = rn;
  }
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
