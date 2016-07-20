class Point {
	constructor(x, y, z){
		this.components = [x, y, z];
		this.x = x;
		this.y = y;
		this.z = z;
	}

	abs() {
		return new Point(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
	}

	largest_abs_component() {
		var temp = this.abs();
		if (temp.components[0] > temp.components[1]) {
			return (temp.components[0] > temp[2]) ? 0 : 2;
		}
		else {
			return (temp.components[1] > temp.components[2]) ? 1 : 2;
		}
	}
}

module.exports = exports = Point;
