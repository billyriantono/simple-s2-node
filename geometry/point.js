function Point(x, y, z) {
  this.components = [x, y, z];
  this.x = x;
  this.y = y;
  this.z = z;
}

Point.prototype.abs = function () {
  return new Point(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
}

Point.prototype.largest_abs_component = function () {
  var temp = this.abs();
  if (temp.components[0] > temp.components[1]) {
    if (temp.components[0] > temp[2])
      return 0;
    else
      return 2;
  }
  else {
    if (temp.components[1] > temp.components[2])
      return 1;
    else
      return 2;
  }
}

module.exports = exports = Point;
