describe('Go-Back-N nodes', function () {

  describe('with parameters w = 4, a = 10, p = 0', function () {

    var clock,
        params = {w: 4, a: 10, p: 0, protocol: 'GBN'},
        transmitter,
        receiver,
        system;

    beforeEach(function () {
      clock = new Clock(-1, 10);
      system = new System(params, clock);
      transmitter = system.node1;
      receiver = system.node2;
    });

    it('should work as expected in the simplest case', function () {
      transmitter.send('hallo');
      clock.setTime(params.a + 1);
      expect(receiver.recv()).toEqual(['hallo']);
    });

    it('should queue w + 1 messages', function () {
      transmitter.send(0);
      transmitter.send(1);
      transmitter.send(2);
      transmitter.send(3);
      transmitter.send(4);
      clock.setTime(params.a + 1);
      expect(receiver.recv()).toEqual([0]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([3]);
      clock.setTime(params.a + 1 + params.a);
      // first ACK received
      expect(transmitter.txlink.queue).toEqual([
        {type: 'I', msg: 4, sn: 4, time: params.a + 1 + params.a + 1}
      ]);
    })

    it('should ignore packets after sending NAK', function () {
      var message = 0;
      clock.addEvent({
        time: 0,
        interval: 1,
        func: function () {
          receiver.recv();
          try {
            transmitter.send(message++);
          } catch (e) {
            // buffer full
          }
        }
      });
      clock.setTime(0);
      expect(transmitter.txlink.queue).toEqual([
        {type: 'I', msg: 0, sn: 0, time: 1}
      ]);
      spyOn(Math, 'random').andReturn(-1);
      clock.advance(1);
      expect(transmitter.txlink.queue).toEqual([
        {type: 'I', msg: 0, sn: 0, time: 1},
        {type: 'I', msg: 1, sn: 1, time: 2, error: 1}
      ]);
      Math.random.andReturn(1);
      clock.advance(params.a + 2);
      expect(transmitter.rxlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: params.a + 1},
        {type: 'S', func: 'NAK', sn: 1, time: 1 + params.a + 1}
      ]);
    });

    it('should send NAK if rxbuf is full', function () {
      transmitter.send(0);  // depart at 0, arrive at 11
      transmitter.send(1);  // 1, 12
      transmitter.send(2);  // 2, 13
      clock.setTime(params.a + 3);  // time = 13
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: params.a + 1},
        {type: 'S', func: 'NAK', sn: 1, time: 1 + params.a + 1}
      ]);
    });

    it('should work as expected in a more complex case', function () {
      transmitter.send(0);
      transmitter.send(1);
      clock.setTime(1);
      // frames #1, #2 have been sent
      spyOn(Math, 'random').andReturn(-1);  // make errors in the next frame
      transmitter.send(2);
      clock.advance(1);
      // frame #3 (erroneous) sent
      Math.random.andReturn(1);
      transmitter.send(3);
      clock.setTime(params.a + 1);
      // frame #1 received
      expect(receiver.recv()).toEqual([0]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      // NAK sent
      expect(receiver.recv()).toEqual([]);
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: params.a + 1},
        {type: 'S', func: 'ACK', sn: 1, time: 1 + params.a + 1},
        {type: 'S', func: 'NAK', sn: 2, time: 2 + params.a + 1}
      ]);
      clock.setTime(2 * params.a + 1);
      // the first ACK received
      transmitter.send(4);
      clock.advance(1);
      expect(transmitter.txlink.queue).toEqual([
        {type: 'I', msg: 4, sn: 4, time: 1 + params.a + 1 + params.a + 1}
      ]);
      clock.advance(1);
      // NAK received
      expect(transmitter.txlink.queue).toEqual([
        {type: 'I', msg: 4, sn: 4, time: 1 + params.a + 1 + params.a + 1},
        {type: 'I', msg: 2, sn: 2, time: 2 + params.a + 1 + params.a + 1}
      ]);
    });

    it('should ignore unrecognizable frames', function () {
      transmitter.send(0);
      clock.setTime(0);
      transmitter.txlink.queue[0].type = 'X';
      clock.setTime(params.a + 1);
      expect(transmitter.rxlink.queue).toEqual([]);
    });
  });
});
