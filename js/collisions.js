/**
* This function determines if two line segments (specified by their start
* and end points) intersect
* The algorithm simply solves the equation system for the two line equations:
* delta1_y * x + delta1_x * y = constant1
* delta2_y * x + delta2_x * y = constant2
* where delta1_y = a2.y - a1.y, delta1_x = a1.x - a2x, constant1 = delta1_y * a1.x
* + delta1_x * a1.y
* (similar for the second line)
*
* For more information on the algorithm research Line-Line intersection algorithms
*
* @param a1 start point of line 1, given by an object with an x and y float
* @param a2 end point of line 1, given by an object with an x and y float
* @param b1 start point of line 2, given by an object with an x and y float
* @param b2 end point of line 2, given by an object with an x and y float
* @returns true if the lines intersect or if they have the same slope and
* some points in common
* false otherwise
*/
function intersectLineLine(a1, a2, b1, b2) {
  this.tolerance = 0.1
  // allow for a certain tolerance as float operations are not exact
  var delta1_y = a2.y - a1.y;
  var delta1_x = a1.x - a2.x;
  var constant1 = (delta1_y * a1.x) + (delta1_x * a1.y);
  var delta2_y = b2.y - b1.y;
  var delta2_x = b1.x - b2.x;
  var constant2 = (delta2_y * b1.x) + (delta2_x * b1.y);
  var determinant = (delta1_y * delta2_x) - (delta1_x * delta2_y);
  var intersect_x;
  var intersect_y;
  var max_x_a = Math.max(a1.x, a2.x);
  var min_x_a = Math.min(a1.x, a2.x);
  var max_y_a = Math.max(a1.y, a2.y);
  var min_y_a = Math.min(a1.y, a2.y);
  var max_x_b = Math.max(b1.x, b2.x);
  var min_x_b = Math.min(b1.x, b2.x);
  var max_y_b = Math.max(b1.y, b2.y);
  var min_y_b = Math.min(b1.y, b2.y);

  if (Math.abs(determinant) < this.tolerance) {
    // Lines are parallel. Do they have a segment in common?
    var sameLine = false;
    if (delta1_x !== 0 && delta2_x !== 0) {
      var ya_atZero = constant1 / delta1_x;
      var yb_atZero = constant2 / delta2_x;
      if (Math.abs(ya_atZero - yb_atZero) < this.tolerance) {
        sameLine = true;
      }
    } else {
      var xa_atZero = constant1 / delta1_y;
      var xb_atZero = constant2 / delta2_y;
      if (Math.abs(xa_atZero - xb_atZero) < this.tolerance) {
        sameLine = true;
      }
    }

    if (sameLine) {
      // segments lie on the same line. Do they have an overlap on the x axis
      if ((Math.abs(max_x_b - min_x_a) < this.tolerance || max_x_b > min_x_a) &&
        (Math.abs(max_y_b - min_y_a) < this.tolerance || max_y_b > min_y_a)) {
        return true;
      }
    }
    return false;
  } else {
    intersect_x = (delta2_x * constant1 - delta1_x * constant2) / determinant;
    intersect_y = (delta1_y * constant2 - delta2_y * constant1) / determinant;

    // Check if the point lies on both lines, allowing for tolerance
    if ((Math.abs(intersect_x - min_x_a) < this.tolerance || intersect_x > min_x_a) &&
      (Math.abs(intersect_x - max_x_a) < this.tolerance || intersect_x < max_x_a) &&
      (Math.abs(intersect_y - min_y_a) < this.tolerance || intersect_y > min_y_a) &&
      (Math.abs(intersect_y - max_y_a) < this.tolerance || intersect_y < max_y_a) &&
      (Math.abs(intersect_x - min_x_b) < this.tolerance || intersect_x > min_x_b) &&
      (Math.abs(intersect_x - max_x_b) < this.tolerance || intersect_x < max_x_b) &&
      (Math.abs(intersect_y - min_y_b) < this.tolerance || intersect_y > min_y_b) &&
      (Math.abs(intersect_y - max_y_b) < this.tolerance || intersect_y < max_y_b)) {
        return true;
    }
    return false;
  }
}