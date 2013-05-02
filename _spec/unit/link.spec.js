describe('Link', function () {

  var mockClock,
      link;

  beforeEach(function () {
    mockClock = {currentTime: 0};
  });

  describe('write() and read()', function () {

    it('should work with a single element', function () {
      link = new Link({a: 10, p: 0}, mockClock);
      link.write({type: 'I', data: 'foo'});
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 10.9;
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 11;
      expect(link.read()).toEqual({type: 'I', data: 'foo', time: 1});
      expect(link.read()).toBeUndefined();
    });

    it('should work with a few elements', function () {
      link = new Link({a: 1, p: 0}, mockClock);
      link.write({type: 'I', sn: 0, data: 'z0F'});
      mockClock.currentTime = 0.2;
      link.write({type: 'I', sn: 1, data: 'R93'});
      mockClock.currentTime = 0.5;
      link.write({type: 'S', rn: 0, func: 'RR'});
      mockClock.currentTime = 0.6;
      link.write({type: 'S', rn: 0, func: 'REJ'});
      mockClock.currentTime = 1.5;
      expect(link.read()).toEqual({type: 'S', rn: 0, func: 'RR', time: 0.5});
      expect(link.read()).toBeUndefined();
      mockClock.currentTime = 1.6;
      expect(link.read()).toEqual({type: 'S', rn: 0, func: 'REJ', time: 0.6});
      mockClock.currentTime = 2.11;
      expect(link.read()).toEqual({type: 'I', sn: 0, data: 'z0F', time: 1});
      mockClock.currentTime = 2.5;
      expect(link.read()).toEqual({type: 'I', sn: 1, data: 'R93', time: 1.2});
      expect(link.read()).toBeUndefined();
    });
  });

  describe('read()', function () {

    it('should discard all but the last element in the queue', function () {
      link = new Link({a: 3, p: 0}, mockClock);
      link.write({type: 'I', sn: 0, data: 'aaa'});
      mockClock.currentTime = 1;
      link.write({type: 'I', sn: 1, data: 'bbb'});
      mockClock.currentTime = 10;
      expect(link.read()).toEqual({type: 'I', sn: 1, data: 'bbb', time: 2});
      expect(link.read()).toBeUndefined();
    });
  });
});
