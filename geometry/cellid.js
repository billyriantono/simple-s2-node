'use strict';

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
const WRAP_OFFSET = BigInt(NUM_FACES) << BigInt(POS_BITS);

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

// Normalize any value (BigInt, number or numeric string) into an unsigned
// 64-bit BigInt, matching S2's wrap-around semantics for out-of-range ids.
function to_u64(value) {
	return BigInt.asUintN(64, BigInt(value));
}

class CellId {
	constructor(cellId){

		if( typeof cellId !== "undefined"){
			this.cellId = to_u64(cellId);
		}
	}

	id() {
		return this.cellId;
	}

	lsb() {
		if (this.cellId === 0n)
			return 0n;

		// Lowest set bit: x & -x (BigInt uses two's-complement bit semantics).
		return this.cellId & (-this.cellId);
	}

	level() {
		// The lsb of a valid cell id is 1 << (2 * (MAX_LEVEL - level)), so the
		// level is MAX_LEVEL minus half the number of trailing zero bits.
		var lsb = this.lsb();
		var level = MAX_LEVEL;
		while (lsb > 1n) {
			lsb >>= 2n;
			level--;
		}
		return Math.max(Math.min(level, MAX_LEVEL), 0);
	}

	advance(steps) {
		if (steps == 0) return new CellId(this.cellId);

		// We clamp the number of steps if necessary to ensure that we do not
		// advance past the End() or before the Begin() of this level.  Note that
		// min_steps and max_steps always fit in a signed 64-bit integer.

		steps = BigInt(steps);
		var step_shift = BigInt(2 * (MAX_LEVEL - this.level()) + 1);
		if (steps < 0n) {
			var min_steps = -(this.cellId >> step_shift); //-static_cast<int64>(id_ >> step_shift);
			if (steps < min_steps) steps = min_steps;
		} else {
			var max_steps = (WRAP_OFFSET + this.lsb() - this.cellId) >> step_shift;
			if (steps > max_steps) steps = max_steps;
		}
		return new CellId(this.cellId + (steps << step_shift));
	}

	prev() {
		var level = this.level();
		var prev = this.advance(-1);
		if (prev.level() !== level) prev = prev.parent(level);
		return prev;
	}

	next() {
		var level = this.level();
		var next = this.advance(1);
		if (next.level() !== level) next = next.parent(level);
		return next;
	}

	lsb_for_level(level) {
		return 1n << BigInt(2 * (MAX_LEVEL - level));
	}

	parent(level) {
		var new_lsb = this.lsb_for_level(level);
		return new CellId((this.cellId & (-new_lsb)) | new_lsb);
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
		var n = BigInt(face) << BigInt(POS_BITS - 1);//face << (POS_BITS - 1);
		var bits = face & SWAP_MASK;

		for (var k = 7; k > -1; k--) {// in range(7, -1, -1):
			var mask = (1 << LOOKUP_BITS) - 1;
			bits += (((i >> (k * LOOKUP_BITS)) & mask) << (LOOKUP_BITS + 2));
			bits += (((j >> (k * LOOKUP_BITS)) & mask) << 2);
			bits = LOOKUP_POS[bits];
			n = n | ((BigInt(bits) >> 2n) << BigInt(k * 2 * LOOKUP_BITS));//n |= (bits >> 2) << (k * 2 * LOOKUP_BITS);
			bits &= (SWAP_MASK | INVERT_MASK);
		}

		// A leaf cell id carries a trailing "1" bit (its lsb) that marks the
		// level. The legacy "bn" library happened to produce this off-by-one
		// implicitly; with exact native BigInt math we add it explicitly.
		return new CellId(n * 2n + 1n);
	}

	toLong(signed) {
		return Utils.long_from_bignum(this.id(), signed);
	}
}

module.exports = CellId;
