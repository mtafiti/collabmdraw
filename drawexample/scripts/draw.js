
// self-executing function that I added to stop this
// new script from interfering with the html page script. 
// It's a good idea in general
(function (window) {


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

	var isDrag = false;
	var isResizeDrag = false;
	var expectResize = -1; // New, will save the # of the selection handle if the mouse is over one.
	var mx, my; // mouse coordinates

	 // when set to true, the canvas will redraw everything
	 // invalidate() just sets this to false right now
	 // we want to call invalidate() whenever we make a change
	var canvasValid = false;

	// The node (if any) being selected.
	// multiple objects - an array
	var mySel = [];

	// The selection color and width. Right now we have a red selection with a small width
	var mySelColor = '#CC0000';
	var mySelWidth = 2;
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
	function Box2() {
	  this.x = 0;
	  this.y = 0;
	  this.w = 1; // default width and height?
	  this.h = 1;
	  this.selected = false;
	  this.fill = getRandomColor(); //'#444444';

	  //unique id
	  this.shpid = generateRandomID();
	}

// Box 'class'
Box2.prototype = {
  // each box is responsible for its own drawing
  // mainDraw() will call this with the normal canvas
  // myDown will call this
  draw: function (context, optionalColor) {
	var i = 0;
      context.fillStyle = this.fill;

      // can skip the drawing of elements that have moved off the screen:
      if (this.x > WIDTH || this.y > HEIGHT) { return; }
      if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

      context.fillRect(this.x, this.y, this.w, this.h);

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
		  selectionHandles[0].x = this.x - half;
		  selectionHandles[0].y = this.y - half;

		  selectionHandles[1].x = this.x + this.w / 2 - half;
		  selectionHandles[1].y = this.y - half;

		  selectionHandles[2].x = this.x + this.w - half;
		  selectionHandles[2].y = this.y - half;

		  //middle left
		  selectionHandles[3].x = this.x - half;
		  selectionHandles[3].y = this.y + this.h / 2 - half;

		  //middle right
		  selectionHandles[4].x = this.x + this.w - half;
		  selectionHandles[4].y = this.y + this.h / 2 - half;

		  //bottom left, middle, right
		  selectionHandles[6].x = this.x + this.w / 2 - half;
		  selectionHandles[6].y = this.y + this.h - half;

		  selectionHandles[5].x = this.x - half;
		  selectionHandles[5].y = this.y + this.h - half;

		  selectionHandles[7].x = this.x + this.w - half;
		  selectionHandles[7].y = this.y + this.h - half;


		  context.fillStyle = mySelBoxColor;
		  for (i = 0; i < 8; i++) {
			var cur = selectionHandles[i];
			context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
		  }
		}
  } // end draw

};

//used to easiy initialize a new Box, 
//add it, and invalidate the canvas
function addRect(x, y, w, h) {
  var rect = new Box2;
  rect.x = x;
  rect.y = y;
  rect.w = w
  rect.h = h;
  rect.fill = arguments[4] || getRandomColor();
  rect.selected = arguments[5];

  //shape id passed in?
  rect.shpid = arguments[6] || rect.shpid;

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

  // set our events. Up and down are for dragging,
  // double click is for making new boxes
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  canvas.ondblclick = myDblClick;
  canvas.onmousemove = myMove;

  // set up the selection handle boxes
  for (var i = 0; i < 8; i ++) {
    var rect = new Box2;
    selectionHandles.push(rect);
  }

  // can add custom initialization code here


  // add a large green rectangle
  // addRect(260, 70, 60, 65, 'rgba(0,205,0,0.7)');
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

// Happens when the mouse is moving inside the canvas
function myMove(e){
  if (isDrag) {
	
	//store some global vars
    getMouse(e);
	
	//move means we are updating sthng that is selected,
	//so report this to others, in case they are doing same thing to.. 
	//..a shape
	for (var i=0; i<boxes2.length; i++){
		var box = boxes2[i];
		if (box.selected){
			box.x = box.x + changeInX;
			box.y = box.y + changeInY;
			publishDistrEvent('editshape',e,box);
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
				switch (expectResize) {
				  case 0:
					box.x = mx;
					box.y = my;
					box.w += newx;
					box.h += newy;
					break;
				  case 1:
					box.y = my;
					box.h += newy;
					break;
				  case 2:
					box.y = my;
					box.w = mx - oldx;
					box.h += oldy - my;
					break;
				  case 3:
					box.x = mx;
					box.w += oldx - mx;
					break;
				  case 4:
					box.w = mx - oldx;
					break;
				  case 5:
					box.x = mx;
					box.w += oldx - mx;
					box.h = my - oldy;
					break;
				  case 6:
					box.h = my - oldy;
					break;
				  case 7:
					box.w = mx - oldx;
					box.h = my - oldy;
					break;
				}
                 //if any value of width or height is -ve 
				 //set minimum width, height
                 if(box.w < 5){
                     box.w = 10;          
				}
                 if(box.h < 5){                
                     box.h = 10;
				}				
                publishDistrEvent('editshape',e,box);  //can create a new state for resize..                                                       //for now use editshape
				invalidate();
			
				break;	//only resize one - to change this later to allow for multi-resize
			}
		}
	}

  getMouse(e);
  // if there's a selection see if we grabbed one of the selection handles
  if (boxSelected() && !isResizeDrag) {

    for (var i = 0; i < 8; i++) {
      // 0  1  2
      // 3     4
      // 5  6  7

      var cur = selectionHandles[i];

      // selection handles will always be rectangles,
	  // so check if we hit this one
      if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
          my >= cur.y && my <= cur.y + mySelBoxSize) {
        // we found one!
        expectResize = i;
        invalidate();
		
		//change cursor - doesnt work in some browsers
        switch (i) {
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

  //we are over a selection box
  if (expectResize !== -1) {
    isResizeDrag = true;
    return;
  }

  var l = boxes2.length;
  
  //loop - check what has been hit
  for (var i = l-1; i >= 0; i--) {

    var box = boxes2[i];

	 // Determine if the box was clicked
	var left1 = box.x;
	var right1 = left1 + box.w;
	var top1 = box.y;
	var bottom1 = box.y + box.h;

    if (mx >= left1 && mx <= right1 && my >= top1 && my <= bottom1) {
		// we hit a box!
		// if this box is not selected then select it only
		// since we are sure this is not a multi select here
		if (!box.selected) {
			clearSelectedBoxes();
		}
		box.selected = true;
		isDrag= true;
		invalidate();
		return;
	}

  }
  // if code reaches this point,
  // means we have selected nothing
  clearSelectedBoxes();

  //so it means we are starting a multi select

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

function myUp(){
	if (isDistEvent && isResizeDrag)
	{
		//notify the rest you stopped "pinching"
		publishDistrEvent('nopinch',null,null);
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
	//end multi select part
	
	invalidate();
}

// adds a new node
function myDblClick(e) {
	getMouse(e);
	// for this method width and height determine the starting X and Y, too.
	// are vars in case we wanted to make them args/global for varying sizes
	var width = 20;
	var height = 20;
	var rect = addRect(mx - (width / 2), my - (height / 2), width, height, null, true, null);

	publishDistrEvent('addshape',e,rect);
}

//made this a function if we wanted to 
//add more logic later
function invalidate() {
  canvasValid = false;
}
//checks if any box is selected
function boxSelected()
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

	// Draw the rectangle
	context.strokeRect(x, y, width, height);
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
function publishDistrEvent(evtType,e,data)
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
	
	publishChange({ shape: data, eventType: evtType, mouseevt: eventOptions, mousexy:  mxy});
}
// Process the distributed event received
// param: data - the mouse, event type and shape data
function processDistrEvent(data)
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
		var rect = addRect(_mx - (width / 2), _my - (height / 2), width, height, data.shape.fill, false, data.shape.shpid);
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
					found= true;
					break;
            }
        }		
		//if the shape is not there, create it. again, this should not be necessary
		//was added due to inconsistencies with socket.io
		if(!found)
		{
		   var rect = addRect(data.shape.x, data.shape.y, data.shape.w, data.shape.h, data.shape.fill, false, data.shape.shpid);
		}
		
        //anyway, if you are dragging, then change mode to resize
        if (isDrag)
        {           
			//set the selection handle
			for (var i=0; i<boxes2.length; i++){
				var box = boxes2[i];
				//check if its the same box, in order to update
				if (box.shpid !== data.shape.shpid)
					continue;							
				
				//calculations for resize - to simulate pinch
				var left1 = box.x;
				var top1 = box.y;				
				var halfx = left1 + (box.w/2);
				var halfy = top1 + (box.h/2);
				var right1 = left1 + box.w;							
				var bottom1 = top1 + box.h;

				//check if the mouse is within the bounds of rect, 
				//(note; also allow if it passes by an offset)
				var offset = 50;
				if (mx >= (left1 - offset) && mx <= (right1 + offset) && my >= (top1-offset) && my <= (bottom1 + offset)) {			
					if (box.selected) {
						//set the status todo: find a better way to set them..
						isDrag = false;
						isResizeDrag = true;
						isDistEvent = true;
						
						//if so, select the nearest selection box
						//calculations - determine if the mouse is within the bounds of the shape
						var selhandles = new Array();
						selhandles.push({x: left1,y: top1});	//sel0
						selhandles.push({x: halfx,y: top1});	//sel1
						selhandles.push({x: right1,y: top1});	//sel2
						selhandles.push({x: left1, y: halfy});	//sel3
						selhandles.push({x: right1, y: halfy});	//sel4
						selhandles.push({x: left1,y: bottom1});	//sel5
						selhandles.push({x: halfx, y: bottom1});	//sel6
						selhandles.push({x: right1,y:bottom1});	//sel7
						
						//get the eucl. distance to determine.. 
						//..how near the remote mouse is to the sel handles
						var leastDist = 99999, idx = -1;
						for (var i=0; i<selhandles.length; i++){
							var handle = selhandles[i];
							var dist = Math.sqrt((mx - handle.x) *(mx - handle.x) + (my - handle.y) * (my - handle.y));
							//check least dist, also idx
							//idx now holds the current nearest selection handle index
							if (dist < leastDist){
									leastDist = dist;
									idx = i;
							}
						}
						//end of loop, so next draw update will use that selection handle
						//to resze shape
						expectResize = idx;					
		
					}
				}
			}
		}
		//	invalidate the canvas!
		invalidate();
	}
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
}
// ------------- Utility function to generate random IDs --------------
 function generateRandomID(start, length)
{
	//default length -> 15
	if (!length)
	length = 15;
	if(!start)
		start = "SHP";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";//"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  var randomstring='';
  for(x=0;x<length;x++)
  {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum,rnum+1);
  }
  return start+randomstring;
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

// -------------- external functions -------------------------

// If we dont want to use <body onLoad='init()'> on client page
// we could uncomment this init() reference and place the script reference inside the body tag
//init();
window.init2 = init2;
window.processDistrEvent = processDistrEvent;
})(window);

