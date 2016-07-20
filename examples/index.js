var s2 = require('../s2');
var LatLng = new s2.S2LatLng();
var CellId = new s2.S2CellId();

var cellId =  CellId.from_lat_lng( 
				LatLng.from_degrees('-6.1753917', '106.8271533')
			);

console.log( "Long value: "+ cellId.toLong(true) );
console.log( "Big num: "+ cellId.id().toString() );

