// Implementation copied from "heapq", a Python standard library module

function Heap(key) {
  // pop() returns elem such that key(elem) is lowest
  this.array = [];
  this.key = key;
}

Heap.prototype.push = function (elem) {
  var array = this.array;
  array.push(elem);
  this._siftUp(0, array.length - 1);
};

Heap.prototype.pop = function () {
  var array = this.array,
      lastelem = array.pop(),
      elem;
  if (array.length) {
    elem = array[0];
    array[0] = lastelem
    this._siftDown(0);
  } else {
    elem = lastelem;
  }
  return elem;
};

Heap.prototype.peek = function () {
  return this.array[0];
};

Heap.prototype.length = function () {
  return this.array.length;
};

Heap.prototype._siftUp = function (start, i) {
  var array = this.array,
      key = this.key,
      elem = array[i],
      i_p,
      parent;
  while (start < i) {
    i_p = (i - 1) >> 1;
    parent = array[i_p];
    if (key(elem) < key(parent)) {
      array[i] = parent;
      i = i_p;
    } else {
      break;
    }
  }
  array[i] = elem;
};

Heap.prototype._siftDown = function (i) {
  var array = this.array,
      key = this.key,
      elem = array[i],
      start = i,
      end = array.length,
      i_c = (i << 1) + 1,
      i_rc,
      child,
      rchild;
  while (i_c < end) {
    i_rc = i_c + 1;
    child = array[i_c];
    if (i_rc < end) {
      rchild = array[i_rc];
      if (key(rchild) < key(child)) {
        i_c = i_rc;
        child = rchild;
      }
    }
    array[i] = child;
    i = i_c;
    i_c = (i << 1) + 1;
  }
  array[i] = elem;
  this._siftUp(start, i);
};
