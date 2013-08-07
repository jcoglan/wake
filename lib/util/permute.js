var permute = function(list) {
  var expanded = {}, n = list.length, K = Math.pow(n,n), i, j, s, u;
  for (i = 0; i < K; i++) {
    s = i.toString(n);
    while (s.length < n) s = '0' + s;
    s = s.split('').map(function(x) { return list[x] });
    u = [];
    for (j = 0; j < s.length; j++) {
      if (u.indexOf(s[j]) < 0) u.push(s[j]);
    }
    expanded[u.join('')] = true;
  }
  return Object.keys(expanded);
};

module.exports = permute;

