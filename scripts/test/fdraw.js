
/** 
*	the drawing application 
*/

(function (window) {
	//2 hash tables: for localrefs and for remoterefs
	var localRefsTable = {}, farRefsTable = {};
	//the gfProxy
	var gfproxy;
		
	//my nickname
	var nick = '';
	var rname = '';
	
	// holds all our boxes
	var boxes2 = [];

	// New, holds the 8 tiny boxes that will be our selection handles
	// the selection handles will be in this order:
	// 0  1  2
	// 3     4
	// 5  6  7
	var selectionHandles = [];

	// Hold canvas information
	var canvas;
	var ctx;
	var WIDTH;
	var HEIGHT;
	var INTERVAL = 20;  // how often, in milliseconds, we check to see if a redraw is needed
	
	//event types
	var BIRTH = 'BIRTH';
	var MOVE = 'MOVE';
	var DEATH = 'DEATH';

	var isDrag = false;
	var isResizeDrag = false;
	var isDrawing = false;
	var expectResize = -1; // New, will save the # of the selection handle if the mouse is over one.
	var mx, my; // mouse coordinates

	 // when set to true, the canvas will redraw everything
	 // invalidate() just sets this to false right now
	 // we want to call invalidate() whenever we make a change
	var canvasValid = false;
	
	//current shape type that we want to draw
	var currDrawType;
	
	//shape properties
	var shapeFill = '#0C69A4';
	var shapeBorderColor = '#0A0A0A';
	var shapeBorderWidth = 2;
	
	// The node (if any) being selected.
	// multiple objects - an array
	var mySel = [];

	// The selection color and width. Right now we have a red selection with a small width
	var mySelColor = '#CC0000';
	var mySelWidth = 3;
	var mySelBoxColor = 'darkred'; // New for selection boxes
	var mySelBoxSize = 6;


	// since we can drag from anywhere in a node
	// instead of just its x/y corner, we need to save
	// the offset of the mouse when we start dragging.
	// also store the change in x and y mouse values
	var offsetx, offsety, changeInX, changeInY, lastMouseX, lastMouseY;

	// Padding and border style widths for mouse offsets
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

	//added for multi-select
	var isMultiSelecting = false;            // Indicates whether or not the user is drawing a selection rectangle
	var selectionStartX;                // Stores the x coordinate of where the user started drawing the selection rectangle
	var selectionStartY;                // Stores the y coordinate of where the user started drawing the selection rectangle
	var selectionEndX;                  // Stores the x coordinate of the end of the current selection rectangle
	var selectionEndY;                  // Stores the y coordinate of the end of the current selection rectangle

	//added for distribution
	var isDistEvent = false;	
	
	
	// Box object to hold data
	function SelHandle(x,y,w,h) {
	  this.x = x||0;
	  this.y = y||0;
	  this.w = 1; // default width and height?
	  this.h = 1;
	  this.selected = false;
	  this.fill = mySelColor; //'#444444';
	  this.strokecolor = getRandomColor(); //'#444444';
	}

	// Box object to hold data
	function Box2(x,y,w,h) {
		this.x = x||0;
		this.y = y||0;
		this.w = w||1; // default width and height?
		this.h = h||1;
		this.selected = false;
		this.fill = shapeFill; //'#444444';
		this.strokecolor = shapeBorderColor; 
		this.strokewidth = shapeBorderWidth;	
		//added this later for distribution
		this.type = 'rect';
		
		//unique id
		this.shpid = generateRandomID('SHP-');
	  	  
		//selection handles for each box
		this.selectionhandles = new Array();
	  
		for (var i = 0; i < 8; i ++) {
			var rect = new SelHandle();
			this.selectionhandles.push(rect);
		}
	}

	// Box 'class'
	Box2.prototype = {
	  // each box is responsible for its own drawing
	  // mainDraw() will call this with the normal canvas
	  // myDown will call this
	  draw: function (context) {
		var i = 0;
		  context.fillStyle = this.fill;

		  // can skip the drawing of elements that have moved off the screen:
		  if (this.x > WIDTH || this.y > HEIGHT) { return; }
		  if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

			context.strokeStyle = this.strokecolor;
			context.lineWidth = this.strokewidth;
			if (this.fill){
				context.fillRect(this.x, this.y, this.w, this.h);
			}
			//draw default outline
			if (!this.selected) {
				context.strokeRect(this.x, this.y, this.w, this.h);
			}
		// draw selection
		// this is a stroke along the box and also 8 new selection handles

			if (this.selected) {
			  context.strokeStyle = mySelColor;
			  context.lineWidth = mySelWidth;
			  context.strokeRect(this.x, this.y, this.w, this.h);

			  // draw the boxes

			  var half = mySelBoxSize / 2;

			  // 0  1  2
			  // 3     4
			  // 5  6  7

			  // top left, middle, right
			  this.selectionhandles[0].x = this.x - half;
			   this.selectionhandles[0].y = this.y - half;

			  this.selectionhandles[1].x = this.x + this.w / 2 - half;
			  this.selectionhandles[1].y = this.y - half;

			  this.selectionhandles[2].x = this.x + this.w - half;
			  this.selectionhandles[2].y = this.y - half;

			  //middle left
			  this.selectionhandles[3].x = this.x - half;
			  this.selectionhandles[3].y = this.y + this.h / 2 - half;

			  //middle right
			  this.selectionhandles[4].x = this.x + this.w - half;
			  this.selectionhandles[4].y = this.y + this.h / 2 - half;

			  //bottom left, middle, right
			  this.selectionhandles[6].x = this.x + this.w / 2 - half;
			  this.selectionhandles[6].y = this.y + this.h - half;

			  this.selectionhandles[5].x = this.x - half;
			  this.selectionhandles[5].y = this.y + this.h - half;

			  this.selectionhandles[7].x = this.x + this.w - half;
			  this.selectionhandles[7].y = this.y + this.h - half;


			  context.fillStyle = mySelBoxColor;
			  for (i = 0; i < 8; i++) {
				var cur = this.selectionhandles[i];
				context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
			  }
			}
	  }, // end draw	  
	  resize: function(handle){
		var oldx = this.x;
		var oldy = this.y;
		var newx = oldx - mx;	//TODO: global
		var newy = oldy - my;	//TODO: global
	  
		switch (handle) {			
				  case 0:
					this.x = mx;
					this.y = my;
					this.w += newx;
					this.h += newy;
					break;
				  case 1:
					this.y = my;
					this.h += newy;
					break;
				  case 2:
					this.y = my;
					this.w = mx - oldx;
					this.h += oldy - my;
					break;
				  case 3:
					this.x = mx;
					this.w += oldx - mx;
					break;
				  case 4:
					this.w = mx - oldx;
					break;
				  case 5:
					this.x = mx;
					this.w += oldx - mx;
					this.h = my - oldy;
					break;
				  case 6:
					this.h = my - oldy;
					break;
				  case 7:
					this.w = mx - oldx;
					this.h = my - oldy;
					break;
				}
                 //if any value of width or height is -ve 
				 //set minimum width, height
                 if(this.w < 5){
                     this.w = 10;          
				}
                 if(this.h < 5){                
                     this.h = 10;
				}				               
	  },
		//get the index of the selected handle of this shape, or -1 if none
		getSelectedHandle: function(mx,my){

			for (i = 0, l = this.selectionhandles.length; i < l; i++) {
				var cur = this.selectionhandles[i];

				// selection handles will always be rectangles,
				// so check if we hit this one
				if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
					my >= cur.y && my <= cur.y + mySelBoxSize) {
					//we found a selected handle, return it
					return i;
				}
			}
			return -1;
	  },
	  //is this box hit?
	  isHit: function(mouseX,mouseY){
		 // Determine if the box was clicked
		var left1 = this.x;
		var right1 = left1 + this.w;
		var top1 = this.y;
		var bottom1 = this.y + this.h;

		if (mouseX >= left1 && mouseX <= right1 && mouseY >= top1 && mouseY <= bottom1) {
			return true;
		}else {
			return false;
		}		
	  }
	};

	/*
	*	Now the definition of the shapes
	*/
	
	//An ellipse
	function Ellipse(x,y,w,h){
		
	  var ellipse = new Box2(x,y,w,h);
	  ellipse.type = 'ellipse';
	  // draw ellipse function. from: 
	  // http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
	  function drawEllipse(ctx, thex, they, thew, theh) {
		  var kappa = .5522848;
		  if (thew<=2) thew = 4;
		  if (theh<=2) theh = 4;		
			  ox = (thew / 2) * kappa, // control point offset horizontal
			  oy = (theh / 2) * kappa, // control point offset vertical
			  xe = thex + thew,           // x-end
			  ye = they + theh,           // y-end
			  xm = thex + thew / 2,       // x-middle
			  ym = they + theh / 2;       // y-middle

		  ctx.beginPath();
		  ctx.moveTo(thex, ym);
		  ctx.bezierCurveTo(thex, ym - oy, xm - ox, they, xm, they);
		  ctx.bezierCurveTo(xm + ox, they, xe, ym - oy, xe, ym);
		  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
		  ctx.bezierCurveTo(xm - ox, ye, thex, ym + oy, thex, ym);
		  ctx.closePath();
		  if (ellipse.fill) ctx.fill();	//fill with current color
		  ctx.stroke();	//draw
		}

	  ellipse.draw = function (context) {
		var i = 0;
		  context.fillStyle = ellipse.fill;

		  // can skip the drawing of elements that have moved off the screen:
		  if (ellipse.x > WIDTH || ellipse.y > HEIGHT) { return; }
		  if (ellipse.x + ellipse.w < 0 || ellipse.y + ellipse.h < 0) { return; }

			context.strokeStyle = ellipse.strokecolor;
			context.lineWidth = ellipse.strokewidth;									
			
			//context.fillRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
			//draw default outline
			if (!ellipse.selected) {
				//context.strokeRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
				drawEllipse(context,ellipse.x,ellipse.y,ellipse.w,ellipse.h);
			}else{
			// draw selection
			// this is a stroke along the box and also 8 new selection handles			
			  context.strokeStyle = mySelColor;
			  context.lineWidth = mySelWidth;
			  //context.strokeRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
			  drawEllipse(context,ellipse.x,ellipse.y,ellipse.w,ellipse.h);
			  
			  // draw the boxes

			  var half = mySelBoxSize / 2;

			  // 0  1  2
			  // 3     4
			  // 5  6  7

			  // top left, middle, right
			  ellipse.selectionhandles[0].x = ellipse.x - half;
			   ellipse.selectionhandles[0].y = ellipse.y - half;

			  ellipse.selectionhandles[1].x = ellipse.x + ellipse.w / 2 - half;
			  ellipse.selectionhandles[1].y = ellipse.y - half;

			  ellipse.selectionhandles[2].x = ellipse.x + ellipse.w - half;
			  ellipse.selectionhandles[2].y = ellipse.y - half;

			  //middle left
			  ellipse.selectionhandles[3].x = ellipse.x - half;
			  ellipse.selectionhandles[3].y = ellipse.y + ellipse.h / 2 - half;

			  //middle right
			  ellipse.selectionhandles[4].x = ellipse.x + ellipse.w - half;
			  ellipse.selectionhandles[4].y = ellipse.y + ellipse.h / 2 - half;

			  //bottom left, middle, right
			  ellipse.selectionhandles[6].x = ellipse.x + ellipse.w / 2 - half;
			  ellipse.selectionhandles[6].y = ellipse.y + ellipse.h - half;

			  ellipse.selectionhandles[5].x = ellipse.x - half;
			  ellipse.selectionhandles[5].y = ellipse.y + ellipse.h - half;

			  ellipse.selectionhandles[7].x = ellipse.x + ellipse.w - half;
			  ellipse.selectionhandles[7].y = ellipse.y + ellipse.h - half;


			  context.fillStyle = mySelBoxColor;
			  for (i = 0; i < 8; i++) {
				var cur = ellipse.selectionhandles[i];
				context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
			  }
			}
	  }; // end draw	  
	  ellipse.resize =function(handle){
		var oldx = ellipse.x;
		var oldy = ellipse.y;
		var newx = oldx - mx;	//TODO: global
		var newy = oldy - my;	//TODO: global
	  
		switch (handle) {
				  case 0:
					ellipse.x = mx;
					ellipse.y = my;
					ellipse.w += newx;
					ellipse.h += newy;
					break;
				  case 1:
					ellipse.y = my;
					ellipse.h += newy;
					break;
				  case 2:
					ellipse.y = my;
					ellipse.w = mx - oldx;
					ellipse.h += oldy - my;
					break;
				  case 3:
					ellipse.x = mx;
					ellipse.w += oldx - mx;
					break;
				  case 4:
					ellipse.w = mx - oldx;
					break;
				  case 5:
					ellipse.x = mx;
					ellipse.w += oldx - mx;
					ellipse.h = my - oldy;
					break;
				  case 6:
					ellipse.h = my - oldy;
					break;
				  case 7:
					ellipse.w = mx - oldx;
					ellipse.h = my - oldy;
					break;
				}
                 //if any value of width or height is -ve 
				 //set minimum width, height
                 if(ellipse.w < 5){
                     ellipse.w = 10;          
				}
                 if(ellipse.h < 5){                
                     ellipse.h = 10;
				}				               
	  };
		//get the index of the selected handle of ellipse shape, or -1 if none
		ellipse.getSelectedHandle = function(mx,my){

			for (i = 0, l = ellipse.selectionhandles.length; i < l; i++) {
				var cur = ellipse.selectionhandles[i];

				// selection handles will always be rectangles,
				// so check if we hit ellipse one
				if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
					my >= cur.y && my <= cur.y + mySelBoxSize) {
					//we found a selected handle, return it
					return i;
				}
			}
			return -1;
	  };
	  
	  return ellipse;
	}
	
	//An crect
	function CRectangle(x,y,w,h){
		
	  var crect = new Box2(x,y,w,h);
	  crect.type = 'crect';
	  // draw rect function. from: 
	  // http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
	  function drawRoundRect(ctx, thex, they, width, height) {
		  radius = 9;
			
		  ctx.beginPath();
		  ctx.moveTo(thex + radius, they);
		  ctx.lineTo(thex + width - radius, they);
		  ctx.quadraticCurveTo(thex + width, they, thex + width, they + radius);
		  ctx.lineTo(thex + width, they + height - radius);
		  ctx.quadraticCurveTo(thex + width, they + height, thex + width - radius, they + height);
		  ctx.lineTo(thex + radius, they + height);
		  ctx.quadraticCurveTo(thex, they + height, thex, they + height - radius);
		  ctx.lineTo(thex, they + radius);
		  ctx.quadraticCurveTo(thex, they, thex + radius, they);
		  ctx.closePath();
		  ctx.stroke();
		  if (crect.fill) {
			ctx.fill();
		  }
		}

	  crect.draw = function (context) {
		var i = 0;
		  context.fillStyle = crect.fill;

		  // can skip the drawing of elements that have moved off the screen:
		  if (crect.x > WIDTH || crect.y > HEIGHT) { return; }
		  if (crect.x + crect.w < 0 || crect.y + crect.h < 0) { return; }

			context.strokeStyle = crect.strokecolor;
			context.lineWidth = crect.strokewidth;									
			
			//context.fillRect(crect.x, crect.y, crect.w, crect.h);
			//draw default outline
			if (!crect.selected) {
				//context.strokeRect(crect.x, crect.y, crect.w, crect.h);
				drawRoundRect(context,crect.x,crect.y,crect.w,crect.h);
			}else{
			// draw selection
			// this is a stroke along the box and also 8 new selection handles			
			  context.strokeStyle = mySelColor;
			  context.lineWidth = mySelWidth;
			  //context.strokeRect(crect.x, crect.y, crect.w, crect.h);
			  drawRoundRect(context,crect.x,crect.y,crect.w,crect.h);
			  
			  // draw the boxes

			  var half = mySelBoxSize / 2;

			  // 0  1  2
			  // 3     4
			  // 5  6  7

			  // top left, middle, right
			  crect.selectionhandles[0].x = crect.x - half;
			   crect.selectionhandles[0].y = crect.y - half;

			  crect.selectionhandles[1].x = crect.x + crect.w / 2 - half;
			  crect.selectionhandles[1].y = crect.y - half;

			  crect.selectionhandles[2].x = crect.x + crect.w - half;
			  crect.selectionhandles[2].y = crect.y - half;

			  //middle left
			  crect.selectionhandles[3].x = crect.x - half;
			  crect.selectionhandles[3].y = crect.y + crect.h / 2 - half;

			  //middle right
			  crect.selectionhandles[4].x = crect.x + crect.w - half;
			  crect.selectionhandles[4].y = crect.y + crect.h / 2 - half;

			  //bottom left, middle, right
			  crect.selectionhandles[6].x = crect.x + crect.w / 2 - half;
			  crect.selectionhandles[6].y = crect.y + crect.h - half;

			  crect.selectionhandles[5].x = crect.x - half;
			  crect.selectionhandles[5].y = crect.y + crect.h - half;

			  crect.selectionhandles[7].x = crect.x + crect.w - half;
			  crect.selectionhandles[7].y = crect.y + crect.h - half;


			  context.fillStyle = mySelBoxColor;
			  for (i = 0; i < 8; i++) {
				var cur = crect.selectionhandles[i];
				context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
			  }
			}
	  }; // end draw	  
	  crect.resize =function(handle){
		var oldx = crect.x;
		var oldy = crect.y;
		var newx = oldx - mx;	//TODO: global
		var newy = oldy - my;	//TODO: global
	  
		switch (handle) {
				  case 0:
					crect.x = mx;
					crect.y = my;
					crect.w += newx;
					crect.h += newy;
					break;
				  case 1:
					crect.y = my;
					crect.h += newy;
					break;
				  case 2:
					crect.y = my;
					crect.w = mx - oldx;
					crect.h += oldy - my;
					break;
				  case 3:
					crect.x = mx;
					crect.w += oldx - mx;
					break;
				  case 4:
					crect.w = mx - oldx;
					break;
				  case 5:
					crect.x = mx;
					crect.w += oldx - mx;
					crect.h = my - oldy;
					break;
				  case 6:
					crect.h = my - oldy;
					break;
				  case 7:
					crect.w = mx - oldx;
					crect.h = my - oldy;
					break;
				}
                 //if any value of width or height is -ve 
				 //set minimum width, height
                 if(crect.w < 5){
                     crect.w = 10;          
				}
                 if(crect.h < 5){                
                     crect.h = 10;
				}				               
	  };
		//get the index of the selected handle of crect shape, or -1 if none
		crect.getSelectedHandle = function(mx,my){

			for (i = 0, l = crect.selectionhandles.length; i < l; i++) {
				var cur = crect.selectionhandles[i];

				// selection handles will always be rectangles,
				// so check if we hit crect one
				if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
					my >= cur.y && my <= cur.y + mySelBoxSize) {
					//we found a selected handle, return it
					return i;
				}
			}
			return -1;
	  };
	  
	  return crect;
	}
	
	
	//for a line, a bit different
	// Box object to hold data
	function Line(x,y,w,h) {
		var line = new Box2(x,y,w,h);
		line.type = 'line';
		
		//specialized draw function
		line.draw = function(context){
			var i = 0;
			context.fillStyle = line.fill;

			// can skip the drawing of elements that have moved off the screen:
			if (line.x > WIDTH || line.y > HEIGHT) { return; }
			if (line.x + line.w < 0 || line.y + line.h < 0) { return; }
			
			context.strokeStyle = line.strokecolor;
			context.lineWidth = line.strokewidth;
			
			context.beginPath();			
			context.moveTo(line.x,line.y);
			context.lineTo(line.x+line.w,line.y+line.h);			
			//ctx.fill();
			context.stroke();			
			//context.closePath();
			
			if (!line.selected) {
				return;
			}
			context.strokeStyle = mySelColor;
			context.lineWidth = mySelWidth;
			//context.strokeRect(this.line.x, this.line.y, this.line.w, this.line.h);			
			
			
			var half = mySelBoxSize / 2;
			
			//line has its own 2 selection handles, remove the rest
			line.selectionhandles.splice(2,line.selectionhandles.length-2);
			// 0  
			//      
			//      1				
			line.selectionhandles[0].x = line.x - half;
			line.selectionhandles[0].y = line.y - half;
			line.selectionhandles[1].x = (line.x + line.w) - half;
			line.selectionhandles[1].y = (line.y + line.h) - half;

			context.fillStyle = mySelBoxColor;
			for (i = 0, l = line.selectionhandles.length; i < l; i++) {
				var cur = line.selectionhandles[i];
				context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
			}
		};
		//specialized resize function for lines
		line.resize = function(handle){
			var oldx = line.x;
			var oldy = line.y;
			var newx = oldx - mx;	//TODO: global
			var newy = oldy - my;	//TODO: global						
			//if expected handle is 7, then change to 1
			if (handle > 1) { handle = 1;}
			switch (handle) {
				  case 0: 
					line.x = mx;
					line.y = my;
					line.w += newx;
					line.h += newy;
					break;
				  case 1:
					line.w = mx - oldx;
					line.h = my - oldy;
					//line.w = -newx;
					//line.h = -newy;
					break;
				 /* case 2:
					line.y = my;
					line.w = mx - oldx;
					line.h += oldy - my;
					break;
				  case 3:
					line.x = mx;
					line.w += oldx - mx;
					break;
				  case 4:
					line.w = mx - oldx;
					break;
				  case 5:
					line.x = mx;
					line.w += oldx - mx;
					line.h = my - oldy;
					break;
				  case 6:
					line.h = my - oldy;
					break;
				  case 7:
					line.w = mx - oldx;
					line.h = my - oldy;
					break;*/
				}               			
		};
		/* 
		// helper function to calculate if line was hit */
		function getHitDist(mX,mY){
			var x1 = line.x;
			var y1 = line.y;
			var x2 = line.x+line.w;
			var y2 = line.y+line.h;		
			
			var delX = line.w;
			var delY = line.h;
			var di = Math.sqrt(delX * delX + delY * delY);
			var ratio = (((mX - x1) * delX + (mY - y1) * delY) / (delX * delX + delY * delY));
			var ret;	
			if (ratio * (1 - ratio) < 0){
				ret = -1;
			}
			else { 
				ret = Math.abs(delX * (mY - y1) - delY * (mX - x1)) / di; 
			}
			return ret;	
		};
		// Determine if the box was clicked
		line.isHit = function(mouseX,mouseY){		
			var hitdistance = getHitDist(mouseX,mouseY);
				
			if (hitdistance === -1 || hitdistance > 4){
				return false;
			}else {
				return true;
			}
		};
	  
	  return line; //return line
	}
	
//used to easiy initialize a new Box, 
//add it, and invalidate the canvas
function addShape(x, y, w, h, fill, sel, rectid, type, strokecol, strokew) {
  var rect;
  switch (type) {	
	case 'line':
		rect = new Line(x,y,w,h);
		break;	
	case 'ellipse':
		rect = new Ellipse(x,y,w,h);
		break;		
	case 'crect':
		rect = new CRectangle(x,y,w,h);
		break;
	case 'rect': default:
		rect = new Box2(x,y,w,h);
		break;
  }

  //fill
  if (fill === '')
	rect.fill = '';
	else
	if (fill) rect.fill = fill;
	else
	rect.fill = shapeFill;
	
  rect.strokecolor = strokecol || shapeBorderColor;
  rect.strokewidth = strokew || shapeBorderWidth;
  rect.selected = sel;

  //shape id
  rect.shpid = rectid || rect.shpid;

  boxes2.push(rect);
  invalidate();
  return rect;
}

// initialize our canvas, add a ghost canvas, set draw loop
// then add everything we want to intially exist on the canvas
function init2() {
  canvas = document.getElementById('canv1');
  HEIGHT = canvas.height;
  WIDTH = canvas.width;
  ctx = canvas.getContext('2d');
 

  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; }

  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (document.defaultView && document.defaultView.getComputedStyle) {
    stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)     || 0;
    stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)      || 0;
    styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
    styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)  || 0;
  }

  // make mainDraw() fire every INTERVAL milliseconds
  setInterval(mainDraw, INTERVAL);

  //the events
  var o = {
		md: myDown,
		mu: myUp,
		mm: myMove,
		seq:{
			invoked: [{			
					fn: "md",
					args: [],
					receiver: ''
				},
				{			
					fn: "mm",
					args: [],
					receiver: ''
				},
				{			
					fn: "mu",
					args: [],
					receiver: ''
				}
			],
			callback: {
				name: "",
				fn: function(args, eventType) {
					//dosthng
					console.log("Distributed event called: "+ eventType);
					//console.dir(args);
				}
			}
		}
  };
	//make it a group object
	groupObject(o);
  
  canvas.onmousedown = o.md;
  canvas.onmouseup = o.mu;
  //canvas.ondblclick = myDblClick;
  canvas.onmousemove = o.mm;
  
  //enter name
  var txt = document.createTextNode(nick|| 'Anon');
	document.getElementById('username1').appendChild(txt);
	
	//default status - selecting mode
	setCurrentDraw('');
	
	//add get and put to the tables
	tableMixin.call(farRefsTable);
	tableMixin.call(localRefsTable);
	//add 'read' in table
	fTableMixin.call(farRefsTable);
	//add 'write' in objects
	lRefsMixin.call(Box2.prototype, localRefsTable, farRefsTable);
}


//wipes the canvas context
function clear(c) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
}

// Main draw loop.
// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function mainDraw() {
  if (canvasValid == false) {
    clear(ctx);

    // stuff to be drawn in the background all the time

    // draw all boxes
    var l = boxes2.length;
	
    for (var i = 0; i < l; i++) {
      boxes2[i].draw(ctx); // each box draws itself
    }

    // can add stuff you want drawn on top all the time here
	//...
	
    // multi select 
	// If the user is drawing a selection rectangle, draw it
	if (isMultiSelecting) {
		drawSelectionRectangle(ctx);
	}
	// end multi select 
      
    canvasValid = true;
  }
}

//set the current drawing type, ideally called from the toolbar
function setCurrentDraw(draw){	
	currDrawType = draw.toLowerCase();
	if (currDrawType !== '' ){
		isDrawing = true;
		//clear all selected shapes
		clearSelectedBoxes();
		
	}
	else
		isDrawing = false;
		
}

// Happens when the mouse is moving inside the canvas
function myMove(e){
	//report to midas
	publishMouseEvent(e,MOVE);
	
  if (isDrag) {
	
	//store some global vars
    getMouse(e);
	
	//move means we are updating sthng that is selected,
	//so report this to others, in case they are doing same thing to a shape
	for (var i=0; i<boxes2.length; i++){
		var box = boxes2[i];
		if (box.selected){
			box.x = box.x + changeInX;
			box.y = box.y + changeInY;
			publishDistData('editshape',e,box);
		}
	}
    // something is changing position so invalidate the canvas
    invalidate();

  } else if (isResizeDrag) {
    // time to resize
	 for (var i=0; i<boxes2.length; i++){
			var box = boxes2[i];
			 if (box.selected){
				var oldx = box.x;
				var oldy = box.y;
                var newx = oldx - mx;
                var newy = oldy - my;
				// 0  1  2
				// 3     4
				// 5  6  7
				box.resize(expectResize);				
                publishDistData('editshape',e,box);  //can create a new state for resize..                                                       
				//for now use editshape
				invalidate();
			
				break;	//only resize one - to change this later to allow for multi-resize
			}
		}
	}

  getMouse(e);
  // if there's a selection see if we grabbed one of the selection handles
	if (isAnyBoxSelected() && !isResizeDrag) {

	var selBoxes = getSelectedBoxes();
	
	//find out selected handle from all objects
	for (var i = 0, l = selBoxes.length; i < l; i++) {
		var cur = selBoxes[i];
		var curhandle = cur.getSelectedHandle(mx,my);
		// 0  1  2
		// 3     4
		// 5  6  7
		if ( curhandle !== -1){		
			// we found one!
			expectResize = curhandle;
			invalidate();

			//change cursor - doesnt work in some browsers
			switch (curhandle) {
				case 0:
					this.style.cursor='nw-resize';
					break;
				case 1:
					this.style.cursor='n-resize';
					break;
				case 2:
					this.style.cursor='ne-resize';
					break;
				case 3:
					this.style.cursor='w-resize';
					break;
				case 4:
					this.style.cursor='e-resize';
					break;
				case 5:
					this.style.cursor='sw-resize';
					break;
				case 6:
					this.style.cursor='s-resize';
					break;
				case 7:
					this.style.cursor='se-resize';
					break;
			}
			return;
		}			
	}
    // not over a selection box, return to normal
    isResizeDrag = false;
	//no selection handle hit
    expectResize = -1;
	//return cursor to normal
    this.style.cursor='auto';

  } else if (isMultiSelecting){
	// Update the end coordinates of the selection rectangle
		getMouse(e);

		selectionEndX = mx;
		selectionEndY = my;

		invalidate();
	}
   //------------ end multi select --------------------------
}

// Happens when the mouse is clicked in the canvas
function myDown(e){
	getMouse(e);
	
	publishMouseEvent(e,BIRTH);
	
	//check if we are over a selection box
	if (expectResize !== -1) {
		isResizeDrag = true;
		return;
	}

	var l = boxes2.length;

	//loop - check what has been hit
	for (var i = l-1; i >= 0; i--) {
		var box = boxes2[i];
		
		/*
		 // Determine if the box was clicked
		 // to draw over a shape: (box.isHit(mx,my) && !isDrawing)
		*/
		if (box.isHit(mx,my)&& !isDrawing){
			// we hit a box!
			// if this box is not selected then select it only
			// since we are sure this is not a multi select here
			
			if (!box.selected ) {
				clearSelectedBoxes();
			}
			box.selected = true;
			isDrag= true;
			invalidate();			
			return;
		}
	}
	
	//we may be drawing a shape now
	//TODO: SET THE ISDRAWING TO TRUE IN THE TOOLBAR CLICK
	if (isDrawing){
		// for this method width and height determine the starting X and Y, too.
		// are vars in case we wanted to make them args/global for varying sizes
		var width = 2;
		var height = 2;
		var rect = addShape(mx - (width / 2), my - (height / 2), width, height, null, true, null, currDrawType);
		isResizeDrag = true;
		//set dragging handle to 7
		expectResize = 7;	//TODO:  CHANGE THIS TO LAST HANDLE OF OBJECT
		
		publishDistData('addshape',e,rect);
		
		return;		
	}
	
	// if code reaches this point,
	// means we have selected nothing
	clearSelectedBoxes();
	
	//1. we are not drawing anything
	currDrawType = '';
	isDrawing = false;
		
	//2. and it means we are starting a multi select - default case

	// Indicate that the user is drawing a selection rectangle and
	// update the selection rectangle start and edit coordinates
	isMultiSelecting = true;
	selectionStartX = mx;
	selectionStartY = my;
	selectionEndX = mx;
	selectionEndY = my;
    // end multiselect vars

	// invalidate because we might need the selection border to disappear
	invalidate();
}

function myUp(e){

	//report to midas
	publishMouseEvent(e,DEATH);
	
	if (isDistEvent && isResizeDrag)
	{
		//notify the rest you stopped "pinching"
		//console.info("someone ruined my pinch!");
		isDistEvent = false;
	}
	isDrag = false;
	isResizeDrag = false;
	
	expectResize = -1;
	
	// we finished multiselecting by doing a mouse up
	if (isMultiSelecting) {
		// Reset the selection rectangle, makes it disappear
		selectShapesInRectangle();
		isMultiSelecting = false;
		selectionStartX = 0;
		selectionStartY = 0;
		selectionEndX = 0;
		selectionEndY = 0;
	}
	//if we are still drawing shapes after mouseup, deselect all
	if (currDrawType !== ''){
		clearSelectedBoxes();
	}
	//end multi select part
	invalidate();
}

// adds a new node
function myDblClick(e) {
	debugger;
	getMouse(e);
	// for this method width and height determine the starting X and Y, too.
	// are vars in case we wanted to make them args/global for varying sizes
	var width = 20;
	var height = 20;
	var rect = addShape(mx - (width / 2), my - (height / 2), width, height, null, true, null, currDrawType);

	publishDistData('addshape',e,rect);
}

//made this a function if we wanted to 
//add more logic later
function invalidate() {
  canvasValid = false;
}
//checks if any box is selected
function isAnyBoxSelected()
{
	for (var i=0; i<boxes2.length; i++)
	{
		if (boxes2[i].selected)
			return true;
	}
	return false;
}

// Clear all selected boxes
function clearSelectedBoxes()
{
	for (var i=0; i<boxes2.length; i++)
	{
		boxes2[i].selected = false;
	}
	invalidate();
}

//untested function
function deleteSelectedBoxes(){

	//here we replace selected boxes with nulls - not to mess with indices..	
	var idxs = new Array();
	for (var i=0, l=boxes2.length; i < l; i++)
	{	
		var thebox = boxes2[i];
		if (thebox.selected)
		{
			publishDistData('delshape',null,{shpid: thebox.shpid} ); 
			boxes2.splice(i,1,null);	//insert a null val			
		}
	}
	//..then remove the nulls
	boxes2 = boxes2.filter(function(val) { 
		return val !== null; 
	});

	invalidate();
}
function deleteAllBoxes(){

	//here we replace selected boxes with nulls - not to mess with indices..	
	var idxs = new Array();
	for (var i=0, l=boxes2.length; i < l; i++)
	{	
		var thebox = boxes2[i];		
		publishDistData('delshape',null,{shpid: thebox.shpid} ); 
		boxes2.splice(i,1,null);	//insert a null val			
	}
	//..then reset the array
	boxes2 = [];
	invalidate();
}
// Get box of id
function getBox(shpid)
{
		for (var i=0; i<boxes2.length; i++)
		{
			var box = boxes2[i];
			if (box.shpid == shpid)
				return box;
		}
		return {};	//check
}
// Get selected boxes
function getSelectedBoxes()
{
		var arr = new Array();
		for (var i=0; i<boxes2.length; i++)
		{
			var box = boxes2[i];
			if (box.selected)
				arr.push(box);
		}
		return arr;
}
//select all boxes
function selectAllBoxes(){
	boxes2.forEach(function(box){
		box.selected = true;
	});
	invalidate();
}
// Sets mx,my to the mouse position relative to the canvas
// unfortunately this can be tricky, we have to worry about padding and borders
function getMouse(e) {
      var element = canvas, offsetX = 0, offsetY = 0;

      if (element.offsetParent) {
        do {
          offsetX += element.offsetLeft;
          offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
      }

      // Add padding and border style widths to offset
      offsetX += stylePaddingLeft;
      offsetY += stylePaddingTop;

      offsetX += styleBorderLeft;
      offsetY += styleBorderTop;
	  
	  //calculate the actual x and y mouse co-ordinates
      mx = e.pageX - offsetX;
      my = e.pageY - offsetY;

	// Calculate the change in mouse position for the last
    // time getMouse was called, useful in mouse move updates
    changeInX = mx - lastMouseX;
    changeInY = my - lastMouseY;

    // Store the current mouseX and mouseY positions
    lastMouseX = mx;
    lastMouseY = my;
}
//  helper function to calibrate the mouse x and y
//  coordinates cross-browser
//  see http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
function normalizeMouseXY(e){
	var x;
	var y;
	if (e.pageX || e.pageY) { 
	  x = e.pageX;
	  y = e.pageY;
	}
	else { 
	  x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
	  y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
	} 
	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;
	
	// x and y contain the mouse position r
	// Do something with this information
	return [x,y];
}
// Multi select function to draw the multi-select rectangle
function drawSelectionRectangle(context) {
	context.strokeStyle = "rgb(200,0,0)";

	// Figure out the top left corner of the rectangle
	var x = Math.min(selectionStartX, selectionEndX);
	var y = Math.min(selectionStartY, selectionEndY);

	// Calculate the width and height of the rectangle
	var width = Math.abs(selectionEndX - selectionStartX);
	var height = Math.abs(selectionEndY - selectionStartY);

	//save stroke width
	var sw = context.lineWidth;
	
	context.lineWidth = 1;
	// Draw the rectangle
	context.strokeRect(x, y, width, height);
	
	//restore stroke width
	context.lineWidth = sw;
}

// See if box is in the user dragged rectangle
function selectShapesInRectangle() {

	// Get the bounds of the drawn rectangle
	var selectionTop = Math.min(selectionStartY, selectionEndY);
	var selectionBottom = Math.max(selectionStartY, selectionEndY);
	var selectionLeft = Math.min(selectionStartX, selectionEndX);
	var selectionRight = Math.max(selectionStartX, selectionEndX);

	// Loop through all the boxes and select if it lies within the
	// bounds of the rectangle
	for (var i = 0; i < boxes2.length; i++) {
		var box = boxes2[i];

		var boxTop = box.y;
		var boxBottom = box.y + box.h;
		var boxLeft = box.x;
		var boxRight = box.x + box.w;

		if (boxTop >= selectionTop && boxBottom <= selectionBottom && boxLeft >= selectionLeft && boxRight <= selectionRight)
		{
			//select the box
			box.selected = true;
		}
	}
}
function publishDistData(evtType,e,data, state)
{
	//report this change to socket.io server
	var eventOptions = {};
	if (e) {
		eventOptions = {
			pointerX:  e.pointerX,
			pointerY:  e.pointerY,
			pageX: e.pageX,
			pageY: e.pageY,
			screenX: e.screenX,
			screenY: e.screenY,
			button: e.button,
			ctrlKey: e.ctrlKey,
			altKey: e.altKey,
			shiftKey: e.shiftKey,
			metaKey: e.metaKey,
			bubbles: e.bubbles,
			cancelable: e.cancelable
		};
	}
	//calculate the relative x,y
	var mxy = normalizeMouseXY(eventOptions);

	publishChange({ shape: data || {}, eventType: evtType, mouseevt: eventOptions, mousexy:  mxy});
}
// Process the distributed event received
// param: data - the mouse, event type and shape data
function processDistData(data)
{
	var _mx,_my;
	
	if (data.mouseevt){
		//more testing needed - 
		//different browsers report different values
		_mx = data.mousexy[0];
		_my = data.mousexy[1];
	}
	
	if (data.eventType === 'addshape')
	{
		// for this method width and height determine the starting X and Y, too.
		var width = 20;		//can make these a parameter in UI
		var height = 20;
		var rect = addShape(_mx - (width / 2), _my - (height / 2), width, height, data.shape.fill, false, data.shape.shpid,data.shape.type, data.shape.strokecolor, data.shape.strokewidth);
	}
	
	if (data.eventType === 'editshape')
	{
		//fallback to see if shape being updated is not in local canvas, so we recreate it
		//ideally this should not happen
		var found =false;
        for (var i=0; i<boxes2.length; i++){
            var box = boxes2[i];
            if (box.shpid === data.shape.shpid){
                    box.x = data.shape.x;
                    box.y = data.shape.y;
                    box.w = data.shape.w;
                    box.h = data.shape.h;
                    box.fill = data.shape.fill;
                    box.strokewidth = data.shape.strokewidth;
                    box.strokecolor = data.shape.strokecolor;
					found= true;
					break;
            }
        }		
		//if the shape is not there, create it. again, this should not be necessary
		//was added due to inconsistencies with socket.io/faye
		if(!found)
		{
			//TODO - send type?
		   var rect = addShape(data.shape.x, data.shape.y, data.shape.w, data.shape.h, data.shape.fill, false, data.shape.shpid,data.shape.type,data.shape.strokecolor, data.shape.strokewidth);
		}
		//	invalidate the canvas!
		invalidate();
	}
	/*
	if (data.eventType === 'nopinch')
	{
		//pinch finished by other party
		//by releasing drag by mouse-up - resume dragging
		if (isResizeDrag)
		{
			isResizeDrag = false;
			expectResize = -1;	
			isDrag = true;		
			invalidate();
		}
		
	}
	*/
	if (data.eventType === 'delshape'){
		//do the same to delete the boxes
		var j;
		for (j=0, l=boxes2.length ; j < l; j++){
				var box = boxes2[j];
				if (box.shpid === data.shape.shpid){
					boxes2.splice(j,1);
					invalidate();
					break;
				}
		}
	}
	if (data.eventType === 'editshapeprops'){
		var thebox = getBox(data.shape.shpid);
		if (thebox){
			thebox.fill  = data.shape.fill;
			thebox.strokecolor  = data.shape.strokecolor;
			thebox.strokewidth  = data.shape.strokewidth;
			invalidate();
		}
	}
}
/* publish each gesture. gtype is either BIRTH, MOVE or DEATH */
function publishMouseEvent(e, gtype){
	//calculate the relative x,y
	var mxy = normalizeMouseXY(e);
	//publish
	publishGesture({x: mxy[0], y: mxy[1], type: gtype});
	
}
//-------------- shape properties -------------------------------------

// change the fill color of selected shapes or next shapes
function changeFill(col){
	shapeFill = col;
	var selboxes = getSelectedBoxes();
	if (selboxes.length> 0){
		for (var i=0; i<selboxes.length; i++){
			var box = selboxes[i];
			box.fill = col;			
			//distribute
			publishDistData('editshapeprops',null,{shpid: box.shpid, fill: box.fill, strokecolor: box.strokecolor, strokewidth: box.strokewidth} );
		}
		invalidate();
	}
}
// change the border color of selected shapes or next shapes
function changeBorderColor(col){
	shapeBorderColor = col;
	var selboxes = getSelectedBoxes();
	if (selboxes.length> 0){
		for (var i=0; i<selboxes.length; i++){
			var box = selboxes[i];
			box.strokecolor = col;			
			//distribute
			publishDistData('editshapeprops',null,{shpid: box.shpid, fill: box.fill, strokecolor: box.strokecolor, strokewidth: box.strokewidth} );
		}
		invalidate();
	}
}

//change the border width of selected shape/next shapes
function changeBorderWidth(width){
	switch (width) {
		case 'thick':  
			shapeBorderWidth = 4;
		break;
		case 'medium':  
			shapeBorderWidth = 3;
		break;
		case 'thin': default: 
			shapeBorderWidth = 2;
		break;
	}
	var selboxes = getSelectedBoxes();
	if (selboxes.length> 0){
		for (var i=0; i<selboxes.length; i++){
			var box = selboxes[i];
			box.strokewidth = shapeBorderWidth;			
			//distribute
			publishDistData('editshapeprops',null,{shpid: box.shpid, fill: box.fill, strokecolor: box.strokecolor, strokewidth: box.strokewidth} );
		}
		invalidate();
	}
}
//----------------- session stuff ------------------------------
//save the session to the server. a room is a session - as per reqs
function saveSession(){
	//ajax call
	//remote call for rooms
	//clone shapes
	var boxes3 = boxes2.map(function(box){
		return {x: box.x, y: box.y, w: box.w, h: box.h, fill: box.fill, 
						shpid: box.shpid, type:box.type, strokecolor: box.strokecolor, strokewidth: box.strokewidth};
	});
	//stringify
	var boxesJson = JSON.stringify(boxes3);
	//remote save
	remoteCall("ajax","request=savesession&rname="+rname+"&data="+boxesJson,function (reply) { 				
		if(reply.success === true) {
			alert("Session saved successfully");
		}else {
			alert("A problem occurred when saving");
		}
	 });
}
function loadSession(){
	//ajax call
	remoteCall("ajax","request=loadsession&rname="+rname,function (reply) { 				
		if(reply.success === true && reply.data !== '') {
			loadShapesFromJson(reply.data);			
			alert("Session loaded successfully");
		}else {
			//do sthng
		}
	 });
}
function loadShapesFromJson(json){
	
	var objects = JSON.parse(json);
	objects.forEach(function(obj){
		var rect = addShape(obj.x, obj.y, obj.w, obj.h, obj.fill, 
						false, obj.shpid,obj.type,obj.strokecolor, obj.strokewidth);
					
	});
}
function setNames(roomname,nickname){
	rname = roomname||''; nick = nickname||'';
}

/**
	Mixins to add localrefs/farrefs functionality
*/
var tableMixin = function(){
	this.get = function(key){				
		return this[key];
	};
	this.put = function(key,val){
		this[key] = val;
	};
};
/**
	Mixin local/far ref semantics to table
	Presumption: all bjects in system have ids
	@param lTable: the local objects table
	@param fTable: the far refs table
*/
var lRefsMixin = function(lTable,fTable){	
	this.write = function(){
		if (!lTable){
			return null;
		}
		if (!this.farid){
			this.farid =  generateRandomID('FAR-');
		}
		//store in local refs
		lTable.put(this.shpid,this.farid);
		//create in far refs
		fTable.put(this.farid, this.shpid);		
		//return far ref
		return this.farid;
	};
};
/**
	Mixin for far ref table to get local ref id
*/
var fTableMixin = function(){	
	this.read = function(farRefID){		
		//get the localid of the far ref
		var lid = this.get(farRefID);
		if (!lid){
			return '';
		}		
		return lid;		
	}
};
/**
	function groupObject: constructor function
	@param config: the object describing the config for the group object
*/
function groupObject(obj){
	var properties, invokeArr;
	
	if ( !obj.seq || !obj.seq.invoked )
		return obj;
		
	//get propertynames as an array
	//properties = Object.getOwnPropertyNames(o);			
	//filter fns only - filter has to exist
	//properties = properties.filter(function(prop){ return typeof prop === "function"; });
	
	//see if only one predicate is defined
	invokeArr = (obj.seq.invoked instanceof Array) === true ? obj.seq.invoked : [obj.seq.invoked];
	
	gfproxy = gfProxyInit(leadersocket, localRefsTable, farRefsTable);
	
	//TODO: where...?
	//TODO: For more than one seq config
	gfproxy.sendConfigToServer(invokeArr, obj.seq.callback);
	
	//now add the actual proxy
	gfproxy.intercept(obj);
}
// ----------------------
/** 
	generateRandomID: Utility function to generate random IDs
	@param: start - an optional starting string for the id
*/
 function generateRandomID(start){
	//array of xters to use
	var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');	
	
	if(!start)
		start = "SHP-";
	
	var chars = CHARS, uuid = new Array(36), rnd=0, r;
	for (var i = 0; i < 36; i++) {
		if (i==8 || i==13 ||  i==18 || i==23) {
			uuid[i] = '-';
		} else if (i==14) {
			uuid[i] = '4';
		} else {
			if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
			r = rnd & 0xf;
			rnd = rnd >> 4;
			uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
		}
	}
	
	return start+uuid.join('');	
}
//  generate random color
//  returns a hex string for color
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}
	/** 
	*	ajax remote POST call
	*	@param url: the url
	*	@param args: the args to send
	*	@param responseCallback	the callback fn
	*/
function remoteCall(url, args, responseCallback) {
	http = new XMLHttpRequest();
	http.open("POST", url, true);
	
	http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	//http.setRequestHeader("Content-length", args.length);
	//http.setRequestHeader("Connection", "close");

	
	http.onreadystatechange = function() {
		if (http.readyState === 4) {
			 if (http.status === 200) {  
				var response = JSON.parse(http.responseText);
				responseCallback(response);  
			} else {  
			  console.log("Error", http.statusText);  
			} 
			
		};
	};
	http.send(args);
}

// -------------- external functions -------------------------

// If we dont want to use <body onLoad='init()'> on client page
// we could uncomment this init() reference and place the script reference inside the body tag
//init();
window.init2 = init2;
window.processDistData = processDistData;
window.setCurrentDraw = setCurrentDraw;
window.changeFill = changeFill;
window.changeBorderColor = changeBorderColor;
window.changeBorderWidth = changeBorderWidth;
window.deleteShapes = deleteSelectedBoxes;
window.deleteAllShapes = deleteAllBoxes;
window.selectAllBoxes = selectAllBoxes;
window.saveSession = saveSession;
window.loadSession = loadSession;
window.setNames = setNames;
})(window);