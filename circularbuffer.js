function CircularBuffer(length, fillValue) {
  this.base = 0;
  this.length = length;
  this.buffer = new Array(length);
  while (length--) {
    this.buffer[length] = fillValue;
  }
}

CircularBuffer.prototype.get = function (i) {
  var n = this.length;
  return this.buffer[((i + this.base) % n + n) % n];
};

CircularBuffer.prototype.set = function (i, elem) {
  var n = this.length;
  this.buffer[((i + this.base) % n + n) % n] = elem;
};

CircularBuffer.prototype.push = function (elem) {
  var base = this.base,
      buffer = this.buffer,
      ret = buffer[base];
  buffer[base] = elem;
  this.base = (base + 1) % this.length;
  return ret;
};

CircularBuffer.prototype.toString = function () {
  var temp = [],
      i,
      n = this.length;
  for (i = 0; i < n; ++i) {
    temp.push(this.get(i));
  }
  return temp.join(',');
};
