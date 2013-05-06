describe('CircularBuffer', function () {

  var buffer;

  describe('push()', function () {

    it('should return the first element if full', function () {
      buffer = new CircularBuffer(2);
      expect(buffer.push(1)).toBeUndefined();
      expect(buffer.push(10)).toBeUndefined();
      expect(buffer.push(100)).toEqual(1);
      expect(buffer.push(1000)).toEqual(10);
      expect(buffer.push(10000)).toEqual(100);
      expect(buffer.push()).toEqual(1000);
      expect(buffer.push()).toEqual(10000);
      expect(buffer.push()).toBeUndefined();
    });
  });

  describe('pop()', function () {

    it('should return the first element', function () {
      buffer = new CircularBuffer(3);
      expect(buffer.pop()).toBeUndefined();
      buffer.push(3);
      expect(buffer.pop()).toEqual(3);
      buffer.push(7);
      buffer.push(0);
      buffer.push(100);
      buffer.push(6);
      expect(buffer.pop()).toEqual(0);
      expect(buffer.pop()).toEqual(100);
      expect(buffer.pop()).toEqual(6);
    });
  });

  describe('get()', function () {

    it('should work with a single element', function () {
      buffer = new CircularBuffer(3);
      buffer.push(100);
      expect(buffer.get(0)).toEqual(100);
    });

    it('should work with several elements', function () {
      buffer = new CircularBuffer(5);
      buffer.push(1);
      buffer.push(4);
      buffer.push(6);
      buffer.push(10);
      expect(buffer.get(0)).toEqual(1);
      expect(buffer.get(1)).toEqual(4);
      expect(buffer.get(2)).toEqual(6);
      expect(buffer.get(3)).toEqual(10);
      buffer.push(15);
      buffer.push(21);
      buffer.push(28);
      buffer.push(36);
      expect(buffer.get(1)).toEqual(15);
      expect(buffer.get(2)).toEqual(21);
      expect(buffer.get(3)).toEqual(28);
      expect(buffer.get(4)).toEqual(36);
    });
  });

  describe('set()', function () {

    it('should do nothing if empty', function () {
      buffer = new CircularBuffer(3);
      buffer.set(0, 42);
      expect(buffer.get(0)).not.toEqual(42);
    });

    it('should work as expected', function () {
      buffer = new CircularBuffer(5);
      buffer.push();
      buffer.push();
      buffer.set(0, 42);
      buffer.set(1, 53);
      expect(buffer.get(0)).toEqual(42);
      expect(buffer.get(1)).toEqual(53);
      expect(buffer.get(2)).toBeUndefined();
    });

    it('should work when interleaved with pop()', function () {
      buffer = new CircularBuffer(3);
      buffer.push(3);
      buffer.push(7);
      buffer.pop();
      buffer.push(1);
      buffer.set(0, 42);
      buffer.set(1, 53);
      expect(buffer.get(0)).toEqual(42);
      expect(buffer.get(1)).toEqual(53);
      expect(buffer.get(2)).toBeUndefined();
    });
  });

  describe('toString()', function () {

    it('should work as expected when empty', function () {
      buffer = new CircularBuffer(3);
      expect(buffer.toString()).toEqual('[]');
    });

    it('should work as expected when half filled', function () {
      buffer = new CircularBuffer(4);
      buffer.push(10);
      buffer.push(3);
      expect(buffer.toString()).toEqual('[10, 3]');
    });

    it('should work as expected when filled', function () {
      buffer = new CircularBuffer(3);
      buffer.push(3);
      buffer.push(1);
      buffer.push(4);
      buffer.push(1);
      buffer.push(5);
      expect(buffer.toString()).toEqual('[4, 1, 5]');
    });

    it('should work as expected when pop() and push() is interleaved', function () {
      buffer = new CircularBuffer(3);
      buffer.push(3);
      buffer.push(1);
      buffer.push(4);
      buffer.pop();
      buffer.pop();
      buffer.push(1);
      buffer.pop();
      buffer.push(5);
      buffer.push(6);
      expect(buffer.toString()).toEqual('[1, 5, 6]');
    });
  });

  describe('toArray()', function () {

    it('should work without arguments', function () {
      buffer = new CircularBuffer(5);
      buffer.push(1);
      expect(buffer.toArray()).toEqual([1]);
    });

    it('should validate indexes', function () {
      buffer = new CircularBuffer(5);
      buffer.push(2);
      buffer.push(3);
      buffer.push(5);
      expect(buffer.toArray(0, 5)).toEqual([2, 3, 5]);
    })
  });
});
