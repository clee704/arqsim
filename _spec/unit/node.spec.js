describe('Node', function () {

  describe('send()', function () {

    it('should throw an error if link is not set', function () {
      var node = new Node(1, 1);
      expect(function () {
        node.send()
      }).toThrow();
    });
  });
});
