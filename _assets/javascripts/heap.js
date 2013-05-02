// Implementation copied from "heapq", a Python standard library module

/**
 * Simple min-heap.
 *
 * key is a function that takes an element as an argument and
 * returns a value that is used to compare elements. If it is
 * not specified, an identity function is used by default.
 */
function Heap(key) {
  this._array = [];
  this._key = key || function (x) { return x; };
}

/**
 * Inserts the specified element to this heap.
 */
Heap.prototype.push = function (element) {
  var array = this._array;
  array.push(element);
  this._siftUp(0, array.length - 1);
};

/**
 * Removes and returns an element at the front of this heap,
 * which has the minimum key.
 */
Heap.prototype.pop = function () {
  var array = this._array,
      lastElement = array.pop(),
      element;
  if (array.length) {
    element = array[0];
    array[0] = lastElement
    this._siftDown(0);
  } else {
    element = lastElement;
  }
  return element;
};

/**
 * Returns an element at the front of this heap,
 * which has the minimum key.
 */
Heap.prototype.peek = function () {
  return this._array[0];
};

/**
 * Returns the number of elements in this heap.
 */
Heap.prototype.length = function () {
  return this._array.length;
};

Heap.prototype._siftUp = function (start, i) {
  var array = this._array,
      key = this._key,
      element = array[i];
  while (start < i) {
    var i_p = (i - 1) >> 1,
        parent = array[i_p];
    if (key(element) < key(parent)) {
      array[i] = parent;
      i = i_p;
    } else {
      break;
    }
  }
  array[i] = element;
};

Heap.prototype._siftDown = function (i) {
  var array = this._array,
      key = this._key,
      element = array[i],
      start = i,
      end = array.length,
      i_c = (i << 1) + 1;
  while (i_c < end) {
    var i_rc = i_c + 1,
        child = array[i_c];
    if (i_rc < end) {
      var rchild = array[i_rc];
      if (key(rchild) < key(child)) {
        i_c = i_rc;
        child = rchild;
      }
    }
    array[i] = child;
    i = i_c;
    i_c = (i << 1) + 1;
  }
  array[i] = element;
  this._siftUp(start, i);
};
