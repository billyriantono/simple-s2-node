const bignum = require('bignum');
const Utils = require('./utils');

const LINEAR_PROJECTION = 0;
const TAN_PROJECTION = 1;
const QUADRATIC_PROJECTION = 2;

const PROJECTION = QUADRATIC_PROJECTION;

const LOOKUP_BITS = 4;
const SWAP_MASK = 0x01;
const INVERT_MASK = 0x02;

const MAX_LEVEL = 30;
const POS_BITS = 2 * MAX_LEVEL + 1;
const MAX_SIZE = 1 << MAX_LEVEL;

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
			if (cellId.lt(0))
				cellId = cellId.add(bignum('10000000000000000', 16));
			
			this.cellId = cellId.mod(bignum('ffffffffffffffff', 16));
		}
	}

	id() {
		return this.cellId;
	}

	lsb() {
		if (this.cellId.eq(0))
			return bignum(0);
		
		var lsb = bignum(1);
		do {
			if (!this.cellId.and(lsb).eq(0))
				return lsb;
			
			lsb = lsb.shiftLeft(1);
		} while (true);
		
		//return this.cellId & (-this.cellId);
	}

	prev() {
		return new CellId(this.cellId.sub(this.lsb().shiftLeft(1)));
	}
	
	next() {
		return new CellId(this.cellId.add(this.lsb().shiftLeft(1)));
	}

	lsb_for_level(level) {
		return 1 << (2 * (MAX_LEVEL - level));
	}

	lsb_shift_for_level(level) {
		return (2 * (MAX_LEVEL - level));
	}

	parent(level) {
		var new_lsb = this.lsb_for_level(level);
		var new_lsb_shift = this.lsb_shift_for_level(level);
		return new CellId(this.cellId.shiftRight(new_lsb_shift).shiftLeft(new_lsb_shift).or(new_lsb));//return new CellId((this.cellId & (-new_lsb)) | new_lsb);
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
		var n = bignum(face).shiftLeft(POS_BITS - 1);//face << (POS_BITS - 1);
		var bits = face & SWAP_MASK;
		
		for (var k = 7; k > -1; k--) {// in range(7, -1, -1):
			var mask = (1 << LOOKUP_BITS) - 1;
			bits += (((i >> (k * LOOKUP_BITS)) & mask) << (LOOKUP_BITS + 2));
			bits += (((j >> (k * LOOKUP_BITS)) & mask) << 2);
			bits = LOOKUP_POS[bits];
			n = n.or(bignum(bits).shiftRight(2).shiftLeft(k * 2 * LOOKUP_BITS));//n |= (bits >> 2) << (k * 2 * LOOKUP_BITS);
			bits &= (SWAP_MASK | INVERT_MASK);
		}
		
		return new CellId(n.mul(2).add(1));
	}
	
	toLong(signed) {
		return Utils.long_from_bignum(this.id(), signed);
	}
}

module.exports = CellId;
