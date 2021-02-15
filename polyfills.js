String.prototype.replaceAll = function (a, b) {
  return this.split(a).join(b);
};

Object.defineProperties(Array.prototype, {
  flatMap: {
    value: function (lambda) {
      return Array.prototype.concat.apply([], this.map(lambda));
    },
    writeable: false,
    enumerable: false,
  },
});
