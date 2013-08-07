var clone = function(value, options) {
  var except = (options || {}).except || [];

  if (typeof value !== 'object' || value === null) {
    return value;
  } else if (value instanceof Array) {
    return value.map(clone);
  } else {
    var _clone = {};
    for (var key in value) {
      if (except.indexOf(key) >= 0) continue;
      _clone[key] = clone(value[key]);
    }
    return _clone;
  }
};

module.exports = clone;

