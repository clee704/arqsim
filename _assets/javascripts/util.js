/**
 * Throw an exception if x is evaluated to false.
 */
function assert(x) {
  if (!x) {
    throw 'assertion failed';
  }
}
