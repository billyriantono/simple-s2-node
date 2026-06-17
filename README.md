# simple-s2-node

Simple S2 Geometry implementation for Node.js (initial code by MMM).

Computes [S2 Geometry](https://s2geometry.io/) cell ids from latitude/longitude
coordinates. Uses native `BigInt` for 64-bit cell id math, so it has
**zero runtime dependencies** and runs on any modern Node.js (>= 12).

## Install

```bash
npm install simple-s2-node
```

## Usage

```js
const s2 = require('simple-s2-node');

const latLng = new s2.S2LatLng();
const cellId = new s2.S2CellId();

const cell = cellId.from_lat_lng(
  latLng.from_degrees('-6.1753917', '106.8271533')
);

console.log(cell.id().toString());   // 3344474484274569983  (BigInt)
console.log(cell.level());           // 30  (leaf cell)
console.log(cell.parent(10).id());   // ancestor cell at level 10
console.log(cell.next().id());       // next cell at the same level
console.log(cell.toLong(true));      // signed 64-bit value (BigInt)
```

`S2CellId.id()` and `S2CellId.toLong()` return native `BigInt` values.

## API

- `S2LatLng.from_degrees(lat, lng)` — build a lat/lng from degrees.
- `S2CellId.from_lat_lng(latLng)` / `from_point(point)` — compute a cell id.
- `S2CellId.id()` — the cell id as a `BigInt`.
- `S2CellId.level()` — the cell level (0–30).
- `S2CellId.parent(level)` — the ancestor cell at the given level.
- `S2CellId.next()` / `prev()` — adjacent cells at the same level.
- `S2CellId.toLong(signed)` — the 64-bit value as a `BigInt`.

## Testing

```bash
npm test
```

## License

GPL-3.0
