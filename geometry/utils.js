'use strict'
const bignum = require('bignum');
const Long = require('long');

const lowMask = bignum('ffffffff', 16);

var Utils = function () {

};


Utils.toRadians = function (degrees) {
  return degrees * Math.PI / 180;
}

Utils.valid_face_xyz_to_uv = function (face, point) {
  //assert p.dot_prod(face_uv_to_xyz(face, 0, 0)) > 0
  if (face == 0)
    return [point.components[1] / point.components[0], point.components[2] / point.components[0]];
  else if (face == 1)
    return [-point.components[0] / point.components[1], point.components[2] / point.components[1]];
  else if (face == 2)
    return [-point.components[0] / point.components[2], -point.components[1] / point.components[2]];
  else if (face == 3)
    return [point.components[2] / point.components[0], point.components[1] / point.components[0]];
  else if (face == 4)
    return [point.components[2] / point.components[1], -point.components[0] / point.components[1]];
  else
    return [-point.components[1] / point.components[2], -point.components[0] / point.components[2]];
}

Utils.xyz_to_face_uv = function (point) {
  var face = point.largest_abs_component();
  if (point.components[face] < 0)
    face += 3;
  var uv = this.valid_face_xyz_to_uv(face, point);
  return [face].concat(uv);
}

Utils.long_from_bignum = function (bignum, signed) {
  return new Long(bignum.and(lowMask).toNumber(), bignum.shiftRight(32).and(lowMask).toNumber(), signed ? false : true);
}

module.exports = exports = Utils;
