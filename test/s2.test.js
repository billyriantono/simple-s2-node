'use strict';

const test = require('node:test');
const assert = require('node:assert');

const s2 = require('../s2');

function leafCell() {
	const latLng = new s2.S2LatLng();
	const cellId = new s2.S2CellId();
	return cellId.from_lat_lng(latLng.from_degrees('-6.1753917', '106.8271533'));
}

test('from_lat_lng produces the expected leaf cell id', () => {
	const cell = leafCell();
	assert.strictEqual(cell.id().toString(), '3344474484274569983');
});

test('id() returns a native BigInt', () => {
	const cell = leafCell();
	assert.strictEqual(typeof cell.id(), 'bigint');
});

test('level() of a leaf cell is MAX_LEVEL (30)', () => {
	assert.strictEqual(leafCell().level(), 30);
});

test('lsb() of a leaf cell is 1', () => {
	assert.strictEqual(leafCell().lsb(), 1n);
});

test('next()/prev() step a leaf cell by 2', () => {
	const cell = leafCell();
	const id = cell.id();
	assert.strictEqual(cell.next().id(), id + 2n);
	assert.strictEqual(cell.prev().id(), id - 2n);
});

test('parent() returns a coarser cell at the requested level', () => {
	const cell = leafCell();
	const parent = cell.parent(10);
	assert.strictEqual(parent.level(), 10);
	assert.strictEqual(parent.id().toString(), '3344473578648109056');
});

test('parent(30) of a leaf cell is the cell itself', () => {
	const cell = leafCell();
	assert.strictEqual(cell.parent(30).id(), cell.id());
});

test('toLong() returns signed and unsigned 64-bit values', () => {
	const cell = leafCell();
	assert.strictEqual(cell.toLong(true), 3344474484274569983n);
	assert.strictEqual(cell.toLong(false), 3344474484274569983n);
});
