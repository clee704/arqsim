// Implementation copied from "heapq", arr Python standard library module

function Heap(key) {
  // pop() returns elem such that key(elem) is lowest
  this.arr = [];
  this.key = key;
}

Heap.prototype.push = function (elem) {
  var arr = this.arr;
  arr.push(elem);
  this._siftUp(0, arr.length - 1);
};

Heap.prototype.pop = function () {
  var arr = this.arr,
      lastelem = arr.pop(),
      elem;
  if (arr.length) {
    elem = arr[0];
    arr[0] = lastelem
    this._siftDown(0);
  } else {
    elem = lastelem;
  }
  return elem;
};

Heap.prototype.peek = function () {
  return this.arr[0];
};

Heap.prototype.length = function () {
  return this.arr.length;
};

Heap.prototype._siftUp = function (start, i) {
  var arr = this.arr,
      key = this.key,
      elem = arr[i],
      i_p,
      parent;
  while (start < i) {
    i_p = (i - 1) >> 1;
    parent = arr[i_p];
    if (key(elem) < key(parent)) {
      arr[i] = parent;
      i = i_p;
    } else {
      break;
    }
  }
  arr[i] = elem;
};

Heap.prototype._siftDown = function (i) {
  var arr = this.arr,
      key = this.key,
      elem = arr[i],
      start = i,
      end = arr.length,
      i_c = (i << 1) + 1,
      i_rc,
      child,
      rchild;
  while (i_c < end) {
    i_rc = i_c + 1;
    child = arr[i_c];
    if (i_rc < end) {
      rchild = arr[i_rc];
      if (key(rchild) < key(child)) {
        i_c = i_rc;
        child = rchild;
      }
    }
    arr[i] = child;
    i = i_c;
    i_c = (i << 1) + 1;
  }
  arr[i] = elem;
  this._siftUp(start, i);
};
