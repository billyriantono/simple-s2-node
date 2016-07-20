const Point = require('./point');
const Utils = require('./utils');

class LatLng {
	constructor(lat, lng){
		//in radians
		
		this.lat = lat;
		this.lng = lng;
	}

	to_point() {
		let {lat, lng} = this;
		let cosphi = Math.cos(lat);
		return new Point(Math.cos(lng) * cosphi, Math.sin(lng) * cosphi, Math.sin(lat));
	}

	from_degrees(lat, lng) {
		return new LatLng(Utils.toRadians(lat), Utils.toRadians(lng));
	}
}

module.exports = exports = LatLng;
