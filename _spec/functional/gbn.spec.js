describe('Go-Back-N nodes', function () {

  describe('with parameters w = 3, a = 10, p = 0', function () {

    var clock,
        params = {w: 4, a: 10, p: 0, protocol: 'GBN'},
        sender,
        receiver,
        system;

    beforeEach(function () {
      clock = new Clock(-1, 10);
      system = new System(params, clock);
      sender = system.node1;
      receiver = system.node2;
    });

    it('should work as expected in the simplest case', function () {
      sender.send('hallo');
      clock.setTime(params.a + 1);
      expect(receiver.recv()).toEqual(['hallo']);
    });

    it('should queue w + 1 messages', function () {
      sender.send(1);
      sender.send(2);
      sender.send(3);
      sender.send(4);
      sender.send(5);
      clock.setTime(params.a + 1);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([3]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([4]);
      clock.setTime(2 * params.a + 1);  // first ACK received
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 22}
      ]);
    })

    it('should reject data from upper layer when txbuf is full', function () {
      sender.send('foo');
      sender.send('foo');
      sender.send('foo');
      sender.send('foo');
      sender.send('foo');
      expect(function () { sender.send('foo'); }).toThrow('buffer full');
    });

    it('should send data in a row', function () {
      sender.send(1);
      sender.send(2);
      sender.send(3);
      clock.setTime(params.a + 1);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([3]);
      expect(receiver.recv()).toEqual([]);
    });

    it('should send one NAK per error', function () {
      var data = 1;
      clock.addEvent({
        time: 0,
        interval: 1,
        func: function () {
          receiver.recv();
          try {
            sender.send(data++);
          } catch (e) {
            // buffer full
          }
        }
      });
      clock.setTime(0);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 1, sn: 0, time: 1}
      ]);
      spyOn(Math, 'random').andReturn(-1);
      clock.advance(1);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 1, sn: 0, time: 1},
        {type: 'I', data: 2, sn: 1, time: 2, error: 1}
      ]);
      Math.random.andReturn(1);
      clock.advance(params.a + 1);
      expect(sender.rxlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: 11},
        {type: 'S', func: 'NAK', sn: 1, time: 12}
      ]);
    });

    it('should discard frames from link if rxbuf is full', function () {
      sender.send(1);  // depart at 0, arrive at 11
      sender.send(2);  // 1, 12
      sender.send(3);  // 1, 13
      clock.setTime(params.a + 3);  // time = 13
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: 11},
      ]);
    });

    it('should work as expected in a more complex case', function () {
      sender.send(1);
      sender.send(2);
      clock.setTime(1);  // frames #1, #2 have been sent
      spyOn(Math, 'random').andReturn(-1);  // make errors in the next frame
      sender.send(3);
      clock.advance(1);  // frame #3 sent
      Math.random.andReturn(1);
      sender.send(4);
      clock.setTime(params.a + 1);  // frame #1 received
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);  // NAK sent
      expect(receiver.recv()).toEqual([]);
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'ACK', sn: 0, time: 11},
        {type: 'S', func: 'ACK', sn: 1, time: 12},
        {type: 'S', func: 'NAK', sn: 2, time: 13}
      ]);
      clock.setTime(2 * params.a + 1);  // the first ACK received
      sender.send(5);
      clock.advance(1);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 23}
      ]);
      clock.advance(1);  // NAK received
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 23},
        {type: 'I', data: 3, sn: 2, time: 24}
      ]);
    });

    it('should ignore unrecognizable frames', function () {
      sender.send(1);
      clock.setTime(0);
      sender.txlink.queue[0].type = 'X';
      clock.setTime(params.a + 1);
      expect(sender.rxlink.queue).toEqual([]);
    });
  });
});
