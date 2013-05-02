describe('CircularBuffer', function () {

  var buffer;

  it('should have a given length even if empty', function () {
    buffer = new CircularBuffer(5);
    expect(buffer.length).toEqual(5);
  });

  it('should have fill values if empty', function () {
    buffer = new CircularBuffer(3, 0);
    for (var i = 0; i < buffer.length; i++) {
      expect(buffer.get(i)).toEqual(0);
    }
  });

  describe('get() and set()', function () {

    it('should work with a few non-overlapping elements', function () {
      buffer = new CircularBuffer(5);
      buffer.set(0, 5);
      buffer.set(3, 10);
      buffer.set(99, 100);
      expect(buffer.get(0)).toEqual(5);
      expect(buffer.get(3)).toEqual(10);
      expect(buffer.get(99)).toEqual(100);
    });

    it('should overwrite values if it overflows', function () {
      buffer = new CircularBuffer(6);
      buffer.set(0, 5);
      buffer.set(12, 1000);
      expect(buffer.get(0)).toEqual(1000);
    });
  });

  describe('get() and push()', function () {

    it('should work with a single element', function () {
      buffer = new CircularBuffer(3);
      buffer.push(100);
      expect(buffer.get(-1)).toEqual(100);
    });

    it('should work with several elements', function () {
      buffer = new CircularBuffer(5);
      buffer.push(1);
      buffer.push(4);
      buffer.push(6);
      buffer.push(10);
      expect(buffer.get(-4)).toEqual(1);
      expect(buffer.get(-3)).toEqual(4);
      expect(buffer.get(-2)).toEqual(6);
      expect(buffer.get(-1)).toEqual(10);
      buffer.push(15);
      buffer.push(21);
      buffer.push(28);
      buffer.push(36);
      expect(buffer.get(-4)).toEqual(15);
      expect(buffer.get(-3)).toEqual(21);
      expect(buffer.get(-2)).toEqual(28);
      expect(buffer.get(-1)).toEqual(36);
    });

    it('should work with large negative indexes', function () {
      buffer = new CircularBuffer(3);
      buffer.push(10);
      buffer.push(20);
      buffer.push(40);
      expect(buffer.get(-11)).toEqual(20);
      expect(buffer.get(-100)).toEqual(40);
    });
  });

  describe('push()', function () {

    it('should return the first element', function () {
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

  describe('toString()', function () {

    it('should work as expected when empty', function () {
      buffer = new CircularBuffer(3);
      expect(buffer.toString()).toEqual('[undefined, undefined, undefined]');
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
  });
});
