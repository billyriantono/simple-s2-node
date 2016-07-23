'use strict'

const bignum = require('bn').BigInteger;
const Utils = require('./utils');

const LINEAR_PROJECTION = 0;
const TAN_PROJECTION = 1;
const QUADRATIC_PROJECTION = 2;

const PROJECTION = QUADRATIC_PROJECTION;

const LOOKUP_BITS = 4;
const SWAP_MASK = 0x01;
const INVERT_MASK = 0x02;

const MAX_LEVEL = 30;
const NUM_FACES = 6;
const POS_BITS = 2 * MAX_LEVEL + 1;
const MAX_SIZE = 1 << MAX_LEVEL;
const WRAP_OFFSET = new bignum(NUM_FACES+'').shiftLeft(POS_BITS);

const POS_TO_IJ = [
	[0, 1, 3, 2],
	[0, 2, 3, 1],
	[3, 2, 0, 1],
	[3, 1, 0, 2]
];
const POS_TO_ORIENTATION = [SWAP_MASK, 0, 0, INVERT_MASK | SWAP_MASK];
var LOOKUP_POS = [];
LOOKUP_POS.length = (1 << (2 * LOOKUP_BITS + 2));
var LOOKUP_IJ = [];
LOOKUP_IJ.length = (1 << (2 * LOOKUP_BITS + 2));


function _init_lookup_cell(level, i, j, orig_orientation, pos, orientation) {
	if (level == LOOKUP_BITS) {
		var ij = (i << LOOKUP_BITS) + j;
		LOOKUP_POS[(ij << 2) + orig_orientation] = (pos << 2) + orientation;
		LOOKUP_IJ[(pos << 2) + orig_orientation] = (ij << 2) + orientation;
	}
	else {
		level = level + 1;
		i <<= 1;
		j <<= 1;
		pos <<= 2;
		var r = POS_TO_IJ[orientation];
		for (var index = 0; index < 4; index++)// in range(4):
		_init_lookup_cell(
			level, i + (r[index] >> 1),
			j + (r[index] & 1), orig_orientation,
			pos + index, orientation ^ POS_TO_ORIENTATION[index]
		);
	}
}

_init_lookup_cell(0, 0, 0, 0, 0, 0)
_init_lookup_cell(0, 0, 0, SWAP_MASK, 0, SWAP_MASK)
_init_lookup_cell(0, 0, 0, INVERT_MASK, 0, INVERT_MASK)
_init_lookup_cell(0, 0, 0, SWAP_MASK | INVERT_MASK, 0, SWAP_MASK | INVERT_MASK)

function uv_to_st(u) {
	if (PROJECTION == LINEAR_PROJECTION)
	return 0.5 * (u + 1)
	else if (PROJECTION == TAN_PROJECTION)
	return (2 * (1.0 / Math.PI)) * (Math.atan(u) * Math.PI / 4.0)
	else if (PROJECTION == QUADRATIC_PROJECTION) {
		if (u >= 0)
		return 0.5 * Math.sqrt(1 + 3 * u);
		else
		return 1 - 0.5 * Math.sqrt(1 - 3 * u);
	}
	else
	throw 'unknown projection type';
};

function st_to_ij(s) {
	return Math.max(0, Math.min(MAX_SIZE - 1, Math.floor(MAX_SIZE * s)));
};

class CellId {
	constructor(cellId){

		if( typeof cellId !== "undefined"){
			if (cellId.intValue() < 0)
				cellId = cellId.add( new bignum('10000000000000000', 16));

			this.cellId = cellId.mod(new bignum('ffffffffffffffff', 16));
		}
	}

	id() {
		return this.cellId;
	}

	lsb() {
		if (this.cellId.toString() === "0")
			return bignum.ZERO;

		var lsb = bignum.ONE;
		do {
			if (this.cellId.and(lsb).toString() !== "0")
				return lsb;

			lsb = lsb.shiftLeft(1);
		} while (true);

		//return this.cellId & (-this.cellId);
	}

	level() {
		var x = new bignum(this.cellId.toString());
	  var level = -1;
	  if (x.toString() !== "0") {
	    level += 16;
	  } else {
	    x = x.shiftRight(32);
	  }
	  // We only need to look at even-numbered bits to determine the
	  // level of a valid cell id.
		x = x.and(x.negate());
	  if (x.and(new bignum("21845")).toString() !== "0") level += 8;
		if (x.and(new bignum("5570645")).toString() !== "0") level += 4;
		if (x.and(new bignum("84215045")).toString() !== "0") level += 2;
		if (x.and(new bignum("286331153")).toString() !== "0") level += 1;
		level = Math.max(Math.min(level, MAX_LEVEL), 0);
	  return level;
	}

	advance(steps) {
	  if (steps == 0) return new CellId(this.cellId);

	  // We clamp the number of steps if necessary to ensure that we do not
	  // advance past the End() or before the Begin() of this level.  Note that
	  // min_steps and max_steps always fit in a signed 64-bit integer.

		steps = new bignum(steps+'');
	  var step_shift = 2 * (MAX_LEVEL - this.level()) + 1;
	  if (parseInt(steps.toString(), 10) < 0) {
	    var min_steps = this.cellId.shiftRight(step_shift).negate() //-static_cast<int64>(id_ >> step_shift);
	    if (steps.compareTo(min_steps) === -1) steps = min_steps;
	  } else {
	    var max_steps = WRAP_OFFSET.add(this.lsb()).subtract(this.cellId).shiftRight(step_shift);
	    if (steps.compareTo(max_steps) === 1) steps = max_steps;
	  }
	  return new CellId(this.cellId.add(steps.shiftLeft(step_shift)));
	}

	prev() {
		return this.advance(-1);
	}

	next() {
		return this.advance(1);
	}

	lsb_for_level(level) {
		return new bignum("1").shiftLeft(2 * (MAX_LEVEL - level));
	}

	parent(level) {
		var new_lsb = this.lsb_for_level(level);
		return new CellId(this.cellId.and(new_lsb.negate()).or(new_lsb).subtract(bignum.ONE));
	}


	from_lat_lng(latLng) {
		return this.from_point(latLng.to_point());
	}

	from_point(point) {
		var fuv = Utils.xyz_to_face_uv(point);

		var face = fuv[0];
		var u = fuv[1];
		var v = fuv[2];
		var i = st_to_ij(uv_to_st(u));
		var j = st_to_ij(uv_to_st(v));

		return this.from_face_ij(face, i, j);
	}

	from_face_ij(face, i, j) {
		var n = (new bignum(String(face))).shiftLeft(POS_BITS - 1);//face << (POS_BITS - 1);
		var bits = face & SWAP_MASK;

		for (var k = 7; k > -1; k--) {// in range(7, -1, -1):
			var mask = (1 << LOOKUP_BITS) - 1;
			bits += (((i >> (k * LOOKUP_BITS)) & mask) << (LOOKUP_BITS + 2));
			bits += (((j >> (k * LOOKUP_BITS)) & mask) << 2);
			bits = LOOKUP_POS[bits];
			n = n.or(  ( new bignum(String(bits))).shiftRight(2).shiftLeft(k * 2 * LOOKUP_BITS));//n |= (bits >> 2) << (k * 2 * LOOKUP_BITS);
			bits &= (SWAP_MASK | INVERT_MASK);
		}

		// when using BigInteger we get a number that is +1 larger that the result
		// we got while using binary openssl functions from "bignum" package.
		// that's why 'add(new bignum("1")' was removed.

		//return new CellId(n.multiply( new bignum("2"))/*.add(new bignum("1"))*/);
		return new CellId(n.multiply( new bignum("2")) );
	}

	toLong(signed) {
		return Utils.long_from_bignum(this.id(), signed);
	}
}

module.exports = CellId;
