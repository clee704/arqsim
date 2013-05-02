describe('Link', function () {

  var mockClock,
      link;

  beforeEach(function () {
    mockClock = {currentTime: 0};
  });

  describe('write() and read()', function () {

    it('should work with a single element', function () {
      link = new Link({a: 10, p: 0}, mockClock);
      link.write({type: 'I', msg: 'foo'});
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 10.9;
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 11;
      expect(link.read()).toEqual({type: 'I', msg: 'foo', time: 1});
      expect(link.read()).toBeUndefined();
    });

    it('should work with a few elements', function () {
      link = new Link({a: 1, p: 0}, mockClock);
      link.write({type: 'I', sn: 0, msg: 'z0F'});
      mockClock.currentTime = 0.2;
      link.write({type: 'I', sn: 1, msg: 'R93'});
      mockClock.currentTime = 0.5;
      link.write({type: 'S', sn: 0, func: 'ACK'});
      mockClock.currentTime = 0.6;
      link.write({type: 'S', sn: 0, func: 'NAK'});
      mockClock.currentTime = 1.5;
      expect(link.read()).toEqual({type: 'S', sn: 0, func: 'ACK', time: 0.5});
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 1.6;
      expect(link.read()).toEqual({type: 'S', sn: 0, func: 'NAK', time: 0.6});
      mockClock.currentTime = 2.11;
      expect(link.read()).toEqual({type: 'I', sn: 0, msg: 'z0F', time: 1});
      mockClock.currentTime = 2.5;
      expect(link.read()).toEqual({type: 'I', sn: 1, msg: 'R93', time: 1.2});
      expect(link.read()).toBeUndefined();
    });
  });

  describe('read()', function () {

    it('should discard all but the last element in the queue', function () {
      link = new Link({a: 3, p: 0}, mockClock);
      link.write({type: 'I', sn: 0, msg: 'aaa'});
      mockClock.currentTime = 1;
      link.write({type: 'I', sn: 1, msg: 'bbb'});
      mockClock.currentTime = 10;
      expect(link.read()).toEqual({type: 'I', sn: 1, msg: 'bbb', time: 2});
      expect(link.read()).toBeUndefined();
    });
  });
});
