describe('Utility functions', function () {

  describe('assert()', function () {

    it('should throw an error if the assertion fails', function () {
      expect(function () {
        assert(false);
      }).toThrow();
    });
  });
});
