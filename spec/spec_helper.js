function merge(obj1, obj2) {
  var ret = {};
  copy(obj1, ret);
  copy(obj2, ret);
  return ret;
}

function copy(src, dst) {
  for (var i in src) {
    if (src.hasOwnProperty(i)) {
      dst[i] = src[i];
    }
  }
}
