describe('Heap', function () {

  var heap;

  beforeEach(function () {
    heap = new Heap();
  });

  describe('push() and pop()', function () {

    it('should work without an element', function () {
      expect(heap.pop()).toBeUndefined();
    });

    it('should work with a single element', function () {
      heap.push(0);
      expect(heap.pop()).toEqual(0);
    });

    it('should work with a few elements', function () {
      heap.push(5);
      heap.push(-1);
      heap.push(2);
      expect(heap.pop()).toEqual(-1);
      expect(heap.pop()).toEqual(2);
      expect(heap.pop()).toEqual(5);
      expect(heap.pop()).toBeUndefined();
    });

    it('should work with many elements', function () {
      var input = [10, 1, -5, 100, 5.5, 43, 0, -25, 10, 1, -3, -100, 50],
          sorted = [],
          output = [],
          x;
      for (var i in input) {
        heap.push(input[i]);
        sorted.push(input[i]);
      }
      while ((x = heap.pop()) !== undefined) {
        output.push(x);
      }
      sorted.sort(function (a, b) { return a - b; });
      expect(output).toEqual(sorted);
    });

    it('should work with different key funtions', function () {
      heap = new Heap(function (x) { return x._id; });
      heap.push({_id: 4, name: 'Homer'});
      heap.push({_id: 3, name: 'Marge'});
      heap.push({_id: 1, name: 'Bart'});
      heap.push({_id: 2, name: 'Lisa'});
      heap.push({_id: 0, name: 'Maggie'});
      expect(heap.pop()).toEqual({_id: 0, name: 'Maggie'});
      expect(heap.pop()).toEqual({_id: 1, name: 'Bart'});
      expect(heap.pop()).toEqual({_id: 2, name: 'Lisa'});
      expect(heap.pop()).toEqual({_id: 3, name: 'Marge'});
      expect(heap.pop()).toEqual({_id: 4, name: 'Homer'});
    });
  });

  describe('peek()', function () {

    it('should work without an element', function () {
      expect(heap.peek()).toBeUndefined();
    });

    it('should work with a few elements', function () {
      heap.push(0);
      heap.push(-5);
      heap.push(100);
      expect(heap.peek()).toEqual(-5);
    });

    it('should not change the length', function () {
      heap.push(0);
      heap.peek();
      expect(heap.length()).toEqual(1);
    });
  });

  describe('length()', function () {

    it('should have a zero length if empty', function () {
      expect(heap.length()).toEqual(0);
    });

    it('should have a correct length if a few elements are pushed and poped', function () {
      heap.push(0);
      heap.push(0);
      heap.push(1);
      heap.pop();
      expect(heap.length()).toEqual(2);
    });
  });
});
