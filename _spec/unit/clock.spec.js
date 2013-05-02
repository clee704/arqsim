describe('Clock', function () {

  var clock,
      output;

  it('should not accept precision < 10', function () {
    expect(function () {
      clock = new Clock(0, 9);
    }).toThrow();
  });

  describe('currentTime', function () {

    it('should be quantized', function () {
      clock = new Clock(5 / 4096, 10);
      expect(clock.currentTime).toEqual(1 / 1024);
    });
  });

  describe('advance() and currentTime', function () {

    beforeEach(function () {
      clock = new Clock(0, 10);
    });

    it('should work in a simple case', function () {
      clock.advance(10);
      expect(clock.currentTime).toEqual(10);
    });

    it('should work when called multiple times', function () {
      clock.advance(5);
      expect(clock.currentTime).toEqual(5);
      clock.advance(10);
      expect(clock.currentTime).toEqual(15);
    });

    it('should quantize time', function () {
      clock.advance(1 / 4096);
      expect(clock.currentTime).toEqual(0);
      clock.advance(7 / 4096);
      expect(clock.currentTime).toEqual(1 / 1024);
      clock.advance(7 / 4096);
      expect(clock.currentTime).toEqual(2 / 1024);
    });

    it('should throw an error if maximum time reached', function () {
      expect(function () {
        clock.advance(Math.pow(2, 43) - 0.01);
      }).not.toThrow();
      expect(function () {
        clock.advance(0.01);
      }).toThrow();
    });
  });

  describe('addEvent() and advance()', function () {

    beforeEach(function () {
      clock = new Clock(0, 10);
      output = [];
    });

    it('should execute events in order', function () {
      var foo = function (bar) { output.push(bar); },
          tmpl = {func: foo};
      clock.addEvent(merge(tmpl, {time: 2 / 1024, args: ['b']}));
      clock.addEvent(merge(tmpl, {time: 1 / 1024, args: ['a']}));
      clock.addEvent(merge(tmpl, {time: 3 / 1024, args: ['c']}));
      clock.advance(Math.pow(2, 43) - 2);
      expect(output).toEqual(['a', 'b', 'c']);
    });

    it('should work with periodic events', function () {
      var foo = function () { output.push(clock.currentTime); };
      clock.addEvent({
        time: 1 / 1024,
        interval: 1,
        func: foo
      });
      clock.advance(1000);
      expect(output.length).toEqual(1000);
      expect(output[0]).toEqual(1 / 1024);
      expect(output[1]).toEqual(1 + 1 / 1024);
      expect(output[999]).toEqual(999 + 1 / 1024);
    });

    it('should throw an error if an event in the past is added', function () {
      var mock = jasmine.createSpyObj('mock', ['foo']);
      clock.advance(10);
      expect(function () {
        clock.addEvent({
          time: 0,
          interval: 1,
          func: mock.foo,
          obj: mock
        });
      }).toThrow();
      clock.advance(10);
      expect(mock.foo).not.toHaveBeenCalled();
    });

    it('should defer callbacks until advance() is called', function () {
      var mock = jasmine.createSpyObj('mock', ['foo']);
      clock.addEvent({
        time: 0,
        func: mock.foo,
        obj: mock
      });
      expect(mock.foo).not.toHaveBeenCalled();
      clock.advance(0);
      expect(mock.foo).toHaveBeenCalled();
    });
  });
});
