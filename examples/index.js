var s2 = require('../s2');

console.log(s2.S2CellId.from_lat_lng(s2.S2LatLng.from_degrees('-6.1753917', '106.8271533')).toLong());
