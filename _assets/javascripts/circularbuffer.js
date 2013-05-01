/**
 * CircularBuffer with a fixed length. An optional paramter
 * fillValue is used to fill the initial buffer.
 */
function CircularBuffer(length, fillValue) {
  /** Number of elements this buffer can contain */
  this.length = length;

  this._base = 0;  // index of the first element
  this._buffer = new Array(length);  // internal container
  while (length--) this._buffer[length] = fillValue;
}

/**
 * Returns an element at the specified index.
 */
CircularBuffer.prototype.get = function (index) {
  var n = this.length;
  return this._buffer[((index + this._base) % n + n) % n];
};

/**
 * Writes the specified element at the specified index.
 */
CircularBuffer.prototype.set = function (index, element) {
  var n = this.length;
  this._buffer[((index + this._base) % n + n) % n] = element;
};

/**
 * Inserts the specified element at the back and returns
 * the element at the front.
 *
 * Elements are shifted by 1 toward the front. For example,
 * if the buffer of length 3 is [3, 5, 2] and 8 is pushed,
 * it returns 3 and the buffer will be then [5, 2, 8].
 */
CircularBuffer.prototype.push = function (element) {
  var base = this._base,
      buffer = this._buffer,
      ret = buffer[base];
  buffer[base] = element;
  this._base = (base + 1) % this.length;
  return ret;
};

/**
 * Returns a string representation of this buffer.
 */
CircularBuffer.prototype.toString = function () {
  var temp = [],
      n = this.length;
  for (var i = 0; i < n; ++i) {
    var element = this.get(i);
    temp.push(element === undefined ? 'undefined' : element);
  }
  return '[' + temp.join(', ') + ']';
};
