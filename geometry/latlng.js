const Point = require('./point');
const Utils = require('./utils');

var LatLng = function (lat, lng) {
  //in radians

  this.lat = lat;
  this.lng = lng;
}

LatLng.prototype.to_point = function () {
  var phi = this.lat;
  var theta = this.lng;
  var cosphi = Math.cos(phi);
  return new Point(Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi));
};

LatLng.from_degrees = function (lat, lng) {
  return new LatLng(Utils.toRadians(lat), Utils.toRadians(lng));
};

module.exports = exports = LatLng;
