var clone = require('./clone');

var merge = function(a, b, deflt) {
  var merged = {}, key;
  for (key in a) merged[key] = a[key];
  for (key in b) merged[key] = b[key];

  if (Object.keys(merged).length === 0) merged = clone(deflt);

  for (key in merged) {
    if (!merged[key]) delete merged[key];
  }
  return merged;
};

module.exports = merge;

