/*

RTT* Visualizer
Author: Pedro Carvalho

1. Pick random node from qRand
2. Find qNear from qRand
3. Calculate qNew from qNear and qRand
4. Select best parent for qNew
5. Rewire tree within radius to go through qnew

*/

$(() => {
	const CANVAS_SIZE = [1000,1000]
	const STEP_SIZE = 15
	const NODE_MAX = 3000
	const NEIGHBORHOOD_RADIUS = 40
	const DELAY = 2

	let NODES = []  // Node defined as { x, y, cost, children }
	let OBSTACLES = [
						[[250,250], [250, 400], [100,400], [100,250]], 
						[[750,610], [750, 600], [300,600], [300,610]]
					]

	const c = document.getElementById("rrt-canvas")
	let ctx = c.getContext("2d")
	ctx.canvas.width  = CANVAS_SIZE[0]
	ctx.canvas.height = CANVAS_SIZE[1]

	function clearCanvas(){
		ctx.clearRect(0, 0, CANVAS_SIZE[0], CANVAS_SIZE[1]);
	}

	function addVertices(nodes){
		nodes.forEach((n,i) => {
			ctx.fillStyle = i > 0 ? "#0000FF" : "#00FF00";
			ctx.fillRect(n.x-2,n.y-2,4,4);
		})
	}

	function addEdges(nodes){
		ctx.strokeStyle = "#0000FF";
		nodes.forEach(n => {
			n.children.forEach(c => {
				ctx.strokeStyle = edgeCollision(n, nodes[c]) ?  "#FF0000" : "#0000FF";
				ctx.beginPath()
				ctx.moveTo(n.x, n.y)
				ctx.lineTo(nodes[c].x, nodes[c].y)
				ctx.stroke()
			})
		})
	}

	function addRadius(point){
		ctx.strokeStyle = "#FF0000"
		ctx.beginPath()
		ctx.arc(point.x, point.y, NEIGHBORHOOD_RADIUS, 0, 2 * Math.PI)
		ctx.stroke()
	}

	function addObstacles(){
		OBSTACLES.forEach(o => {
			ctx.beginPath();
			o.forEach((v,i) => {
				if(i === 0) {
					ctx.moveTo(v[0],v[1])
				} else {
					ctx.lineTo(v[0],v[1]);
				}			
			})
			ctx.closePath();
			ctx.fillStyle = "#008080"
			ctx.fill();
		})
	}

	function pointInPolygon(point, vs){
	    var x = point[0], y = point[1];
	    
	    var inside = false;
	    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
	        var xi = vs[i][0], yi = vs[i][1];
	        var xj = vs[j][0], yj = vs[j][1];
	        
	        var intersect = ((yi > y) != (yj > y))
	            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
	        if (intersect) inside = !inside;
	    }
	    
	    return inside;
	}

	//Test an edge againtst all existing obstacles
	function edgeCollision(point1, point2){
		return OBSTACLES.reduce((bool, o) => bool || lineInPolygon([point1, point2], o),false)
	}

	function lineInPolygon(line, polygon){
		return polygon.reduce((bool, edge, i) => {
			nextIdx = i+1 < polygon.length ? i+1 : 0
			bool = bool || intersectLineLine({x:edge[0], y:edge[1]}, {x:polygon[nextIdx][0], y:polygon[nextIdx][1]}, line[0], line[1]) 
			return bool
		},false)
	}

	//Measure euclidian distance
	function getDistance(a, b){
		return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2)
	}

	//Returns the index of the closest node
	function getClosest(point){
		let currDist
		return NODES.reduce((closest, node, i) => {
			currDist = getDistance(point, node)
			if(closest[1] === null || currDist < closest[1]) closest = [i, currDist]
			return closest
		}, [0, null])[0]
	}

	//Returns the closest point to qRand that's collision free and within our step size
	function getCandidate(qRand, qNearIdx){
		const qNear = NODES[qNearIdx]
		const totalDist = getDistance(qRand, qNear)
		//qRand is within the stepSize and there is no edge colision
		if(totalDist < STEP_SIZE && !edgeCollision(qNear, qRand)) {
			return qRand
		// qRand is too far or in collision. We have to try a closer point	
		} else {
			let candidate
			let stepDist = STEP_SIZE
			do {
				candidate = {x:((stepDist/totalDist)*(qRand.x-qNear.x))+qNear.x, y:((stepDist/totalDist)*(qRand.y-qNear.y))+qNear.y}
				stepDist-- //Reduce in case we are in collision so we can try again on the next iteration
				if(stepDist <= 0) return null
			} while(pointCollision(candidate) || edgeCollision(candidate, qNear)) 
			return candidate
		}
	}

	//For a given point, get a list of neighbor nodes within a radius
	function getNeighbors(point){
		return NODES.reduce((neighbors, node, i) => {
			let distance = getDistance(point, node)
			if(distance > 0 && distance <= NEIGHBORHOOD_RADIUS) neighbors.push(i)
			return neighbors
		}, [])
	}

	//Check all nodes within the neighborhood, and find the best possible parent (the one closest to root) -- Return index and cost
	function getBestParent(point){
		let currCost, neighbors = getNeighbors(point)
		return neighbors.reduce((best, neighbor) => {
			currCost = NODES[neighbor].cost + getDistance(point, NODES[neighbor]) && !edgeCollision(point, NODES[neighbor])
			if(best[1] === null || currCost < best[1]) best = [neighbor, currCost]
			return best
		}, [0, null])
	}

	function rewireTree(newNode){
		let neighbors = getNeighbors(newNode)
		let currNode
		//Iterate through all neighbors and check if better off going thorugh the new node
		let newChildren = neighbors.filter(nidx => {
			currNode = NODES[nidx]
			return newNode.cost + getDistance(newNode, currNode) < currNode.cost && !edgeCollision(newNode, currNode)
		})
		if(newChildren.length){
			let parentIdx
			//For each new child,
			newChildren.forEach(childIdx => {
				//First, find the parent and remove the child reference
				parent = NODES.filter(node => node.children.indexOf(childIdx) > -1)[0]
				parent.children.splice(parent.children.indexOf(childIdx), 1);

				//Now add it to the newNode
				newNode.children.push(childIdx)
				return childIdx
			})
		}
	}

	//Check for colision against existing nodes and c-obstacles
	function pointCollision(point){
		//Check to see if the point matches any existing point and check for collision against c-obstacles
		return NODES.reduce((bool, n) => bool || n.x === point.x && n.y === point.y, false) || OBSTACLES.reduce((bool, o) => bool = bool || pointInPolygon([point.x, point.y], o), false)
	}

	//Sample a colision free point on canvas
	function sample(){
		let point
		do {
			point = {x:Math.random()*CANVAS_SIZE[0], y:Math.random()*CANVAS_SIZE[1]}
		} while(pointCollision(point))
		return point
	}

	//Execute main code
	function rrt(start, end){
		let qRand, qNear, qNew
		start.cost = 0
		start.children = []

		//Add starting node to the tree
		NODES.push(start)


		let nodeLoop = setInterval(() => {
			qRand = sample()
			qNear = getClosest(qRand) //This is the index of qNear
			qNew = getCandidate(qRand, qNear)

			//If we couldn't find a suitable qNew, we're probably too close to the edge. Just pick a new point
			if(qNew) {
				//Once we get qNew, we check for the best parent
				qParent = getBestParent(qNew)
				console.log("Candidate Collision?", edgeCollision(qNew, NODES[qNear]), "Parent Collision?", edgeCollision(qNew, qParent))
				// console.log("qRand", qRand, "qNearIdx", qNear, "qNew", qNew, "qParent", qParent)
				qNew.cost = qParent[1]
				qNew.children = []

				NODES.push(qNew)
				NODES[qParent[0]].children.push(NODES.length-1)
				rewireTree(qNew)

				clearCanvas()
				addObstacles()
				addRadius(JSON.parse(JSON.stringify(qNew)))
				addEdges(JSON.parse(JSON.stringify(NODES)))
				addVertices(JSON.parse(JSON.stringify(NODES)))
				
				//Continue while start and end nodes are not connected and maximum number of nodes has not been reached
				if(NODES.length >= NODE_MAX) clearInterval(nodeLoop)
			}
		}, DELAY)

	}

	$("#rrt-canvas").on("click",(ev) => {
		console.log("point in polygon?", pointInPolygon([ev.pageX, ev.pageY], OBSTACLES[0]))
	})

	//Run rrt
	rrt({x:CANVAS_SIZE[0]/2, y:CANVAS_SIZE[1]/2})

})