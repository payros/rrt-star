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
	const CANVAS_SIZE = [window.innerWidth,window.innerHeight]

	let NODE_LOOP, TEMP_OBSTACLE
	let SETTINGS = localStorage.getItem('SETTINGS') ? JSON.parse(localStorage.getItem('SETTINGS')) : {
		STEP_SIZE:15,
		NODE_MAX:4000,
		NEIGHBORHOOD_RADIUS:40,
		DELAY:20,
		COLORS_ON:true,
		RRT:true
	}
	let STATE = "READY"
	let CONNECTED = false //Flag to define if we start and end points are connected
	let NODES = []  // Node defined as { x, y, cost, children }
	let MAX_COST = 0
	let OBSTACLES = []
	let START = {x:CANVAS_SIZE[0]/2, y:CANVAS_SIZE[1]/2}
	let END = sample()

	const c = document.getElementById("rrt-canvas")
	let ctx = c.getContext("2d")
	ctx.canvas.width  = CANVAS_SIZE[0]
	ctx.canvas.height = CANVAS_SIZE[1]

	function decimalToHex(d, padding) {
	    var hex = Number(d).toString(16);
	    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

	    while (hex.length < padding) {
	        hex = "0" + hex;
	    }

	    return hex;
	}

	function costToColor(num) {
	  let R,G,B
	  if(num < MAX_COST/2){
	  	const color = 255-Math.round(num * 255 / (MAX_COST/2))
	  	R = "00"
	  	G = decimalToHex(color,2)
	  	B = decimalToHex(255-color,2)		
	  } else {
	  	const color = 255-Math.round((num - MAX_COST/2) * 255 / (MAX_COST - MAX_COST/2))
	  	R = decimalToHex(255-color,2)	
		G = "00"
		B = decimalToHex(color,2)
	  }	
	  return "#" + R + G + B
	}

	function clearCanvas(){
		ctx.clearRect(0, 0, CANVAS_SIZE[0], CANVAS_SIZE[1]);
	}

	function addVertices(){
		NODES.filter(n => !n.isPath).forEach((n,i) => {
			ctx.fillStyle = SETTINGS.COLORS_ON ? costToColor(n.cost) : "#0000FF"
			ctx.fillRect(n.x-2,n.y-2,4,4)
		})
		//Add starting node last
		addPoint(NODES[0], "#00FF00")
	}

	function addPoint(point, color, radius){
		ctx.fillStyle = color
		ctx.strokeStyle = "#333333"
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.arc(point.x, point.y, radius || 6, 0, 2 * Math.PI)
		ctx.fill()
		ctx.stroke()	
	}

	function addEdge(point1, point2, color, lineWidth){
		ctx.strokeStyle = color || (SETTINGS.COLORS_ON ? costToColor(point1.cost) : "#0000FF")
		ctx.lineWidth = lineWidth || 1
		ctx.beginPath()
		ctx.moveTo(point1.x, point1.y)
		ctx.lineTo(point2.x, point2.y)
		ctx.stroke()	
	} 

	function addEdges(){
		NODES.forEach(n => {
			n.children.filter(c => !NODES[c].isPath).forEach(c => addEdge(n, NODES[c]))
		})
	}

	function addPath(){
		//Add edges
		NODES.filter(n => n.isPath).forEach(n => {
			n.children.filter(c => NODES[c].isPath).forEach(c => addEdge(n, NODES[c], "#49D552", 4))
		})

		//Add points
		NODES.filter(n => n.isPath).forEach((n,i) => {
			ctx.fillStyle = "#49D552"
			ctx.fillRect(n.x-2,n.y-2,4,4)
		})

		//Add starting node last
		addPoint(NODES[0], "#00FF00")
	}

	function addRadius(point){
		ctx.strokeStyle = "#FF0000"
		ctx.beginPath()
		ctx.arc(point.x, point.y, SETTINGS.NEIGHBORHOOD_RADIUS, 0, 2 * Math.PI)
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

	function addPartialObstacle(){
			ctx.beginPath();
			TEMP_OBSTACLE.forEach((v,i) => {
				if(i === 0) {
					ctx.moveTo(v[0],v[1])
				} else {
					ctx.lineTo(v[0],v[1]);
				}			
			})
			ctx.strokeStyle = "#008080"
			ctx.stroke();
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

	function lineInPolygon(line, polygon, skipLast){
		return polygon.reduce((bool, edge, i) => {
			if(skipLast && i === polygon.length-1) return bool
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
		if(totalDist < SETTINGS.STEP_SIZE && !edgeCollision(qNear, qRand)) {
			return qRand
		// qRand is too far or in collision. We have to try a closer point	
		} else {
			let candidate
			let stepDist = SETTINGS.STEP_SIZE
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
			if(distance > 0 && distance <= SETTINGS.NEIGHBORHOOD_RADIUS) neighbors.push(i)
			return neighbors
		}, [])
	}

	//Check all nodes within the neighborhood, and find the best possible parent (the one closest to root) -- Return index and cost
	function getBestParent(point){
		let currCost, neighbors = getNeighbors(point)
		return neighbors.reduce((best, neighbor) => {
			currCost = NODES[neighbor].cost + getDistance(point, NODES[neighbor])
			if(!edgeCollision(point, NODES[neighbor]) && (best[1] === null || currCost < best[1])) best = [neighbor, currCost]
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

	//Try to connect the tree to the final node. Return true if successful
	function connect(node, endpoint){
		let dist = getDistance(node, endpoint)
		if(dist < SETTINGS.NEIGHBORHOOD_RADIUS && !edgeCollision(node, endpoint)){
			endpoint.children = []
			endpoint.cost = node.cost + dist
			NODES.push(endpoint)
			NODES[NODES.length-2].children.push(NODES.length-1)
			search(NODES[0])
			return true
		}
		return false
	}

	//Search for the end node using DFS
	function search(node){
		node.isPath = false
		//This is the end node!
		if(JSON.stringify(node) === JSON.stringify(NODES[NODES.length-1])) {
			node.isPath = true
			return true
		}
		//Loop though the children until you find a path
		for (let i = 0; i < node.children.length; i++) {
			node.isPath = search(NODES[node.children[i]])
			if(node.isPath) break
		}
		return node.isPath
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

	//Setup operations
	function init(){
		NODES = []

		START.cost = 0
		START.children = []
		//Add starting node to the tree
		NODES.push(START)
		clearCanvas()
		addObstacles()
		addVertices()
		addPoint(END, "#FF0000")
	}

	function displayError(errorMsg){
		$("#error-msg > h4").text(errorMsg)
		$("#error-msg").fadeIn(200)
		setTimeout(() => { $("#error-msg").fadeOut(400)}, 2000)
	}

	function setInput(){
		for(let SETTING in SETTINGS){
			if(SETTING === 'COLORS_ON' || SETTING === 'RRT'){
				$("input[name=" + SETTING + "]").prop('checked', SETTINGS[SETTING])
			} else {
				$("input[name=" + SETTING + "]").val(SETTINGS[SETTING])
			}
		}
	}

	function handleStart(){
		STATE = "RUNNING"
		$("#start-btn").text("Stop")
		$(".settings-btn").prop('disabled', true)
	}

	function handleEnd(){
		clearInterval(NODE_LOOP)
		STATE = "READY"
		$("#start-btn").text("Find Path")
		$(".settings-btn").prop('disabled', false)
	}

	function handleGoalPoints(){
		if(STATE !== "ADD_START" && STATE !== "ADD_END") {
			STATE = "ADD_START"
			$("#start-end-btn").text("Cancel")
			$("#start-btn, #obstacles-btn, #settings-btn").prop('disabled', true)
		} else {
			STATE = "READY"
			$("#start-btn, #obstacles-btn, #settings-btn").prop('disabled', false)
			$("#start-end-btn").text("Add Start/End")
			$("#rrt-canvas").css("cursor","pointer")
			init()
		}

	}

	function handleAddStart(point){
		if(pointCollision(point)) {
			displayError("Start Point Must Be Collision Free")
		} else {
			START = point
			STATE = "ADD_END"
		}
	}

	function handleAddEnd(point){
		if(pointCollision(point)) {
			displayError("End Point Must Be Collision Free")
		} else {
			END = point
			handleGoalPoints()
		}
	}

	function handleAddObstaclePoint(point){
		if(pointCollision(point)){
			displayError("Obstacle Vertex Must Be Collision Free")
		} else {
			if(TEMP_OBSTACLE.length){
				let prevPoint = TEMP_OBSTACLE[TEMP_OBSTACLE.length-1]
				//If this line will be in collision, don't add
				TEST_OBSTACLE = TEMP_OBSTACLE.slice(0,-1) //Remove the previous line. We don't have to compare to the previous line.
				if(getDistance(point, {x:TEMP_OBSTACLE[0][0], y:TEMP_OBSTACLE[0][1]}) <= 6) TEST_OBSTACLE = TEST_OBSTACLE.slice(1) //If we're close enough to the first vertex, we'll close the polygon so don't check
				if(TEST_OBSTACLE.length > 1 && lineInPolygon([point, {x:prevPoint[0], y:prevPoint[1]}], TEST_OBSTACLE, true) || edgeCollision(point, {x:prevPoint[0], y:prevPoint[1]})){
					displayError("Obstacle Edge Must Be Collision Free")
				} else {
					//Check if you can close the polygon
					if(TEMP_OBSTACLE.length > 1 && getDistance(point, {x:TEMP_OBSTACLE[0][0], y:TEMP_OBSTACLE[0][1]}) <= 6) {
						OBSTACLES.push(TEMP_OBSTACLE)
						TEMP_OBSTACLE = []
						if(pointCollision(START)) START = sample()
						if(pointCollision(END)) END = sample()
						$("#obstacles-btn").text("Done")
					//If you can't close the polygon, just add an extra point
					} else {
						TEMP_OBSTACLE.push([point.x,point.y])
					}	
				}
			//This is the first point, just add it.
			} else {
				TEMP_OBSTACLE.push([point.x,point.y])
				$("#obstacles-btn").text("Cancel")
				console.log(TEMP_OBSTACLE)
			}
		}
	}

	function handleAddObstacles(){
		TEMP_OBSTACLE = []
		if(STATE === "ADD_OBSTACLE") {
			STATE = "READY"
			$("#start-btn, #start-end-btn, #settings-btn").prop('disabled', false)
			$("#obstacles-btn").text("Add Obstacles")
			init()
		} else {
			OBSTACLES = []
			STATE = "ADD_OBSTACLE"
			$("#start-btn, #start-end-btn, #settings-btn").prop('disabled', true)
			$("#obstacles-btn").text("Done")
		}
	}

	function handleInputChange(ev){
		if(ev.target.type === 'checkbox'){
			SETTINGS[ev.target.name] = ev.target.checked
		} else {
			SETTINGS[ev.target.name] = ev.target.value
		}
		localStorage.setItem("SETTINGS", JSON.stringify(SETTINGS))
	}

	//Execute main code
	function rrt(){
		let qRand, qNear, qNew

		init()

		//Handle GUI start
		handleStart()

		NODE_LOOP = setInterval(() => {
			qRand = sample()
			qNear = getClosest(qRand) //This is the index of qNear
			qNew = getCandidate(qRand, qNear)

			//If we couldn't find a suitable qNew, we're probably too close to the edge. Just pick a new point
			if(qNew) {
				//Once we get qNew, we check for the best parent
				if(!SETTINGS.RRT) qParent = getBestParent(qNew)
				qNew.cost = SETTINGS.RRT ? NODES[qNear].cost + getDistance(qNew, NODES[qNear]) : qParent[1]
				qNew.children = []

				//Push the new node (and edge) into the tree
				NODES.push(qNew)
				NODES[(SETTINGS.RRT ? qNear : qParent[0])].children.push(NODES.length-1)

				//Rewire the tree to get shorter paths
				if(!SETTINGS.RRT) rewireTree(qNew)

				//Check if we can connect to the end-point
				CONNECTED = connect(qNew, END)

				//Update the MAX COST
				if(SETTINGS.COLORS_ON) MAX_COST = NODES.reduce((maxCost, n) => n.cost > maxCost ? n.cost : maxCost, 0)

				//Render onto the canvas
				clearCanvas()
				addObstacles()
				addEdges()
				addVertices()
				if(CONNECTED) addPath()
				addPoint(END, "#FF0000") //Add Endpoint

				//Continue while start and end nodes are not connected and maximum number of nodes has not been reached
				if(NODES.length >= SETTINGS.NODE_MAX || CONNECTED){
					handleEnd()
				} else {
					if(!SETTINGS.RRT) addRadius(JSON.parse(JSON.stringify(qNew)))
				}
			}
		}, SETTINGS.DELAY)
	}

	$("#rrt-canvas").on("click",(ev) => {
		switch(STATE){
			case "ADD_START":
				handleAddStart({x:ev.pageX, y:ev.pageY})
				break
			case "ADD_END":
				handleAddEnd({x:ev.pageX, y:ev.pageY})
				break
			case "ADD_OBSTACLE":
				handleAddObstaclePoint({x:ev.pageX, y:ev.pageY})
		}
	})

	$("#rrt-canvas").on("mousemove", (ev) => {
		switch(STATE){
			case "ADD_START":
				clearCanvas()
				addObstacles()
				if(!pointCollision({x:ev.pageX, y:ev.pageY})){
					addPoint({x:ev.pageX, y:ev.pageY}, "#00FF00")
					$("#rrt-canvas").css("cursor","grabbing")
				} else {
					$("#rrt-canvas").css("cursor","not-allowed")
				}
				break
			case "ADD_END":
				clearCanvas()
				addObstacles()
				addPoint(START, "#00FF00")
				if(!pointCollision({x:ev.pageX, y:ev.pageY})){
					addPoint({x:ev.pageX, y:ev.pageY}, "#FF0000")
					$("#rrt-canvas").css("cursor","grabbing")
				} else {
					$("#rrt-canvas").css("cursor","not-allowed")
				}
				break
			case "ADD_OBSTACLE":
				let l = TEMP_OBSTACLE.length
				clearCanvas()
				addObstacles()
				addPoint(START, "#00FF00")
				addPoint(END, "#FF0000")
				if(!pointCollision({x:ev.pageX, y:ev.pageY})) addPoint({x:ev.pageX, y:ev.pageY}, "#008080")
				if(l >= 2) addPartialObstacle()
				if(l >= 1) addEdge({x:TEMP_OBSTACLE[l-1][0], y:TEMP_OBSTACLE[l-1][1]}, {x:ev.pageX, y:ev.pageY}, "#008080") 
				break
		}
	})

	$("#start-btn").on("click",(ev) => {
		switch(STATE){
			case "RUNNING":
				handleEnd()
				break
			case "READY":
				rrt()
				break
		}
	})

	$("#start-end-btn").on("click", handleGoalPoints)
	$("#obstacles-btn").on("click", handleAddObstacles)
	$("#settings-btn").on("click", () => { setInput(); $("#modal-container").fadeIn(400) })
	$("#close-btn, #modal-container").on("click", () => { $("#modal-container").fadeOut(200) })
	$("#modal").on("click", (e) => { e.stopPropagation() })
	$("input").on("change", handleInputChange)

	rrt()

})