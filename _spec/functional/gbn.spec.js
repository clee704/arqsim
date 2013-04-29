describe('Go-Back-N nodes', function () {

  describe('with parameters w = 3, a = 10, p = 0', function () {

    var clock,
        params = {w: 4, a: 10, timeout: 22, p: 0},
        sender,
        receiver,
        system;

    beforeEach(function () {
      clock = new Clock(-1, 10);
      sender = new GbnNode(params);
      receiver = new GbnNode(params);
      system = new System(params, sender, receiver);
      system.setClock(clock);
    });

    it('should work as expected in the simplest case', function () {
      sender.send('hallo');
      clock.advance(1);  // time = 0; sender._send is called now
      clock.advance(11); // time = 11
      expect(receiver.recv()).toEqual(['hallo']);
      clock.advance(10);
      expect(receiver.recv()).toEqual([]);
    });

    it('should work when txextra is used', function () {
      sender.send(1);
      sender.send(2);
      sender.send(3);
      sender.send(4);
      sender.send(5);
      clock.advance(12);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([3]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([4]);
      clock.advance(8);
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
      sender.send(1); // depart at 0, arrive at 11
      sender.send(2); // 1, 12
      sender.send(3); // 2, 13
      clock.advance(12); // time = 11
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);  // time = 12
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);  // time = 13
      expect(receiver.recv()).toEqual([3]);
      expect(receiver.recv()).toEqual([]);
    });

    it('should send one REJ per error', function () {
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
      clock.advance(1);
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
      clock.advance(15);
      expect(sender.rxlink.queue).toEqual([
        {type: 'S', func: 'RR', rn: 1, time: 11},
        {type: 'S', func: 'REJ', rn: 1, time: 13}
      ]);
    });

    it('should reject data from link if rxbuf is full', function () {
      sender.send(1); // depart at 0, arrive at 11
      sender.send(2); // 1, 12
      clock.advance(13); // time = 12
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'RR', rn: 1, time: 11},
        {type: 'S', func: 'REJ', rn: 1, time: 12}
      ]);
    });

    it('should work as expected in a more complex case', function () {
      sender.txtimeout = 100;  // effectively disable timeout
      sender.send(1);
      sender.send(2);
      clock.advance(2);  // time = 1, frames #1, #2 have been sent
      spyOn(Math, 'random').andReturn(-1);  // make errors in the next frame
      sender.send(3);
      clock.advance(1);  // time = 2, frame #3 sent
      Math.random.andReturn(1);
      sender.send(4);
      clock.advance(9); // time = 11
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1); // time = 12
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1); // time = 13
      expect(receiver.recv()).toEqual([]);
      clock.advance(1); // time = 14, NACK sent
      expect(receiver.recv()).toEqual([]);
      expect(receiver.txlink.queue).toEqual([
        {type: 'S', func: 'RR', rn: 1, time: 11},
        {type: 'S', func: 'RR', rn: 2, time: 12},
        {type: 'S', func: 'REJ', rn: 2, time: 14}
      ]);
      clock.advance(7);  // time = 21, the first ACK received
      sender.send(5);
      clock.advance(1);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 23}
      ]);
      clock.advance(2);  // time = 24, NACK received
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 23},
        {type: 'I', data: 3, sn: 2, time: 25}
      ]);
    });

    it('should detect timeout', function () {
      sender.send(1);
      spyOn(Math, 'random').andReturn(-1);
      clock.advance(1);
      Math.random.andReturn(1);
      clock.advance(sender.txtimeout);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 1, sn: 0, time: sender.txtimeout + 1}
      ]);
    });

    it('should work if some ACK packets are lost', function () {
      sender.txtimeout = 100;
      sender.send(1);
      sender.send(2);
      sender.send(3);
      sender.send(4);
      clock.advance(3);  // all frames have been sent
      clock.advance(9);
      expect(receiver.recv()).toEqual([1]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([2]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([3]);
      clock.advance(1);
      expect(receiver.recv()).toEqual([4]);
      sender.rxlink.queue.splice(0, 3); // remove all but the last ACK packet
      clock.advance(10); // last ACK received
      sender.send(5);
      clock.advance(1);
      expect(sender.txlink.queue).toEqual([
        {type: 'I', data: 5, sn: 4, time: 26}
      ]);
    });

    it('should ignore unrecognizable frames', function () {
      sender.send(1);
      clock.advance(1);
      sender.txlink.queue[0].type = 'X';
      clock.advance(11);
      expect(sender.rxlink.queue).toEqual([]);
    });
  });
});
