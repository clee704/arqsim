/**
 * CircularBuffer with a fixed capacity.
 */
function CircularBuffer(capacity) {
  /** Maximum number of elements this buffer can contain */
  this.capacity = capacity;
  /** Number of elements this buffer contains */
  this.length = 0;

  this._base = 0;  // index of the first element
  this._buffer = new Array(capacity);  // internal container
}

/**
 * Returns an element at the specified index.
 */
CircularBuffer.prototype.get = function (index) {
  if (this.length == 0) return;
  var c = this.capacity;
  return this._buffer[(index + this._base) % c];
};

CircularBuffer.prototype.set = function (index, element) {
  var length = this.length;
  if (length == 0 || index < 0 || index >= length) return;
  var c = this.capacity;
  this._buffer[(index + this._base) % c] = element;
};

/**
 * Inserts the specified element at the back. Removes and returns
 * the element at the front if otherwise the buffer will exceed its capacity.
 *
 * Elements are shifted by 1 toward the front. For example,
 * if the buffer of length 3 is [3, 5, 2] and 8 is pushed,
 * it returns 3 and the buffer will be then [5, 2, 8].
 */
CircularBuffer.prototype.push = function (element) {
  var capacity = this.capacity,
      length = this.length,
      base = this._base,
      buffer = this._buffer;
  if (length == capacity) {
    var ret = buffer[base];
    buffer[base] = element;
    this._base = (base + 1) % capacity;
    return ret;
  } else {
    buffer[(base + length) % capacity] = element;
    this.length = length + 1;
  }
};

CircularBuffer.prototype.pop = function () {
  var length = this.length;
  if (length == 0) return;
  var base = this._base,
      buffer = this._buffer,
      ret = buffer[base];
  buffer[base] = undefined;
  this._base = (base + 1) % this.capacity;
  this.length = length - 1;
  return ret;
};

/**
 * Returns a string representation of this buffer.
 */
CircularBuffer.prototype.toString = function () {
  var temp = [],
      n = this.length;
  for (var i = 0; i < n; ++i) {
    temp.push(this.get(i));
  }
  return '[' + temp.join(', ') + ']';
};

/**
 * Returns an array representation of this buffer.
 */
CircularBuffer.prototype.toArray = function (start, end) {
  var temp = [],
      n = Math.min(end || this.length, this.length);
  for (var i = start || 0; i < n; ++i) {
    temp.push(this.get(i));
  }
  return temp;
};
