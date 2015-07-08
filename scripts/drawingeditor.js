/**
 * Created by kk.
 */
// MINGO CODE: 41 (RULES CEP)
//             14 (GROUPCOMM + REPLICATION ONLY)
// TOTALCODE : 1167 (SOME 160 UNUSED CODE)

//requires utils.js

function DrawingEditor(canvasid, width, height){

    var INTERVAL = 100;

    var DEFAULT_LINECOLOR = '#CC0000', DEFAULT_SELECTION_LINEWEIGHT = 3, DEFAULT_SELECTED_COLOR = '#CC0000',
        DEFAULT_SELECTION_BOX_COLOR = 'darkred', DEFAULT_SELECTION_BOX_SIZE = 6, DEFAULT_SHAPE_FILL_COLOR = '#0C69A4',
        DEFAULT_SHAPE_LINE_COLOR= '#0A0A0A', DEFAULT_SHAPE_LINE_WEIGHT = 2;

    var self = this;

    this.init = function(){
        this.canvas = document.getElementById(canvasid);    //note:document refers to the page
        if (!this.canvas){
            throw new Error("DrawingEditor->init: Canvas not defined: " + canvasid);
        }

        this.canvas.shpid = "CANVAS1";    //todo: canvas random id

        this.context = this.canvas.getContext('2d');

        this.allshapes = [];

        this.canvasValid = false;

        // fixes mouse co-ordinate problems when there's a border or padding
        if (document.defaultView && document.defaultView.getComputedStyle) {
            this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingLeft'], 10)     || 0;
            this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['paddingTop'], 10)      || 0;
            this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderLeftWidth'], 10) || 0;
            this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(this.canvas, null)['borderTopWidth'], 10)  || 0;
        }
        //fixes a problem where double clicking causes text to get selected on the canvas
        this.canvas.onselectstart = function () { return false; };
        //selection variables
        this.selectionStartX = 0;
        this.selectionStartX = 0;                // Stores the x coordinate of where the user started drawing the selection rectangle
        this.selectionStartY = 0;                // Stores the y coordinate of where the user started drawing the selection rectangle
        this.selectionEndX = 0;                  // Stores the x coordinate of the end of the current selection rectangle
        this.selectionEndY = 0;
        // since we can drag from anywhere in a node instead of just its x/y corner, we need to save
        // the offset of the mouse when we start dragging. also store the change in x and y mouse values
        this.offsetX =0; this.offsetY =0; this.changeInX = 0; this.changeInY =0; this.lastMouseX=0; this.lastMouseY=0;

        // Padding and border style widths for mouse offsets
        this.stylePaddingLeft =0; this.stylePaddingTop=0; this.styleBorderLeft=0; this.styleBorderTop=0;

        this.expectResize = -1; // New, will save the # of the selection handle if the mouse is over one.
        this.mx=0; this.my=0; // mouse coordinates
        this.lastMouseX = 0; this.lastMouseY =0;    //previous mouse coordinates
        this.changeInX = 0; this.changeInY =0;    // delata of curent and previous mouse coordinates

        //refresh
        this.refreshInterval = INTERVAL;    //DEFAULT interval
        this.refreshHandle = null;
        this.setRefreshRate(self.refreshInterval);

        //drawing
        this.setCurrentDraw('');  //default
        this.currentlyDrawing = false;
        this.multiselecting = false;

        //attributes
        this.shapeFillColor = DEFAULT_SHAPE_FILL_COLOR;
        this.shapeLineColor = DEFAULT_SHAPE_LINE_COLOR;
        this.shapeLineWeight = DEFAULT_SHAPE_LINE_WEIGHT;

        // The selection color and width. Right now we have a red selection with a small width
        this.selectedColor = DEFAULT_SELECTED_COLOR;
        this.selectedWidth = DEFAULT_SELECTION_LINEWEIGHT;
        this.selectionBoxLineColor = DEFAULT_SELECTION_BOX_COLOR;
        this.selectionBoxFillColor = DEFAULT_SELECTION_BOX_COLOR;
        this.selectionBoxSize = DEFAULT_SELECTION_BOX_SIZE;
        this.selectionBoxLineWidth = DEFAULT_SELECTION_LINEWEIGHT;

        this.canvas.onmousedown = this.mouseDownDefault.bind(this);
        this.canvas.onmousemove = this.mouseMoveDefault.bind(this);
        this.canvas.onmouseup = this.mouseUpDefault.bind(this);

        //make it fit mobile device space
        // Set canvas dimensions

        this.refitCanvas();

    };

    this.init();
}

DrawingEditor.prototype.getWidth = function(){
    return this.width;
};

DrawingEditor.prototype.getHeight = function(){
    return this.height;
};

DrawingEditor.prototype.getCanvas = function(){
    return this.canvas;
};

DrawingEditor.prototype.getDrawingContext = function(){
    return this.context;
};

DrawingEditor.prototype.addEvent = function(eventtype, fn){
    if (typeof fn !== 'function'){
        throw new Error("DrawingEditor->addMEvent: Invalid function to attach to event: " + eventtype);
    }
    switch (eventtype){

        case 'mousedown':
            this.getCanvas().addEventListener('mousedown', fn);
            break;
        case 'mousemove':
            this.getCanvas().addEventListener('mousemove', fn);
            break;
        case 'mouseup':
            this.getCanvas().addEventListener('mouseup', fn);
            break;
        default:
            this.getCanvas().addEventListener('mousedown', fn);
            break;
    }
};


/* -------------- Drawing Functions ---------------- */

DrawingEditor.prototype.getAllShapes = function(){
    return this.allshapes;
};
DrawingEditor.prototype.setShapes = function(shapes){
    this.allshapes = shapes || [];
};

DrawingEditor.prototype.isCanvasValid = function(){
  return this.canvasValid;
};

DrawingEditor.prototype.setCanvasValid = function(isValid){
    this.canvasValid = isValid;
};
// alias for setCanvasValid false
DrawingEditor.prototype.invalidate = function(){
    this.setCanvasValid(false);
};

DrawingEditor.prototype.getWidth = function(){
    return this.width;
};

DrawingEditor.prototype.refresh = function(){
    var allshapes = this.getAllShapes();
    if (!this.isCanvasValid()) {
        this.clear();

        // stuff to be drawn in the background all the time

        // draw all boxes
        var l = allshapes.length;

        for (var i = 0; i < l; i++) {
            allshapes[i].draw(); // each shape draws itself
        }

        //can add other things here

        // multi select
        // If the user is drawing a selection rectangle, draw it
        if (this.isMultiSelecting()) {
            this.drawSelectionRectangle();
        }
        // end multi select

        this.setCanvasValid(true);
    }
};

/**
 * Sets the refresh rate for the editor
 * @param interval - the refresh interval
 */
DrawingEditor.prototype.setRefreshRate = function(interval){
    //reset any previous one
    if (this.refreshHandle){
        clearInterval(this.refreshHandle);  //js function clearinterval
    }

    // fire every INTERVAL milliseconds
    this.refreshHandle = setInterval(this.refresh.bind(this), interval);
};

// clears
DrawingEditor.prototype.clear = function(){
    this.getDrawingContext().clearRect(0, 0, this.width, this.height);
};

DrawingEditor.prototype.refitCanvas = function() {
    //if no height/width is defined
    if (!this.width && window) {

        var canvasDiv = document.getElementById('canvas');

        var left = canvasDiv.offsetLeft;
        var top = canvasDiv.offsetTop;

        var width = (window.innerWidth - left - 20);
        var height = (window.innerHeight - top - 30);


        this.canvas.width = width ;
        this.canvas.height = height;

        canvasDiv.setAttribute('style', 'width: ' + (width + 20) + 'px; height: ' + (height + 20) + 'px;');

        //also set these heights to the border images
        //add as new css
        utils.addCssProperty('#canvas .ML, #canvas .MM, #canvas .MR', ' height: '+ (height - 30) + 'px; ');
        utils.addCssProperty('#canvas .TM, #canvas .MM, #canvas .BM', ' width: '+ (width - 20)+ 'px; ');

        //var dk = window.getComputedStyle(this.canvas,null).getPropertyValue('height');

        this.width = this.canvas.width;
        this.height = this.canvas.height;
    } else {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

};


DrawingEditor.prototype.clearSelectedBoxes = function(){
    var allshapes = this.getAllShapes();

    for (var i=0; i<allshapes.length; i++){
        if (allshapes[i].isSelected()){
            allshapes[i].unselect();
        }
    }
    this.invalidate();
};

/**
 * are we currently drawing?
 */
DrawingEditor.prototype.isDrawing = function(){
    return this.currentlyDrawing;
};
DrawingEditor.prototype.setDrawing = function(isDrawing){
    this.currentlyDrawing = isDrawing;
};

// Indicates whether or not the user is drawing a selection rectangle
DrawingEditor.prototype.isDragging = function(){
    return this.isDrag;
};
DrawingEditor.prototype.setisDragging = function(val){
    this.isDrag = val;
};

/**
 * Sets the current drawing status
 * @param draw
 */
DrawingEditor.prototype.setCurrentDraw = function(draw){

    this.currDrawType = draw.toLowerCase();
    if (this.currDrawType !== '' ){
        this.setDrawing(true);
        //clear all selected shapes
        this.clearSelectedBoxes();
    }
    else {
        this.setDrawing(false);
    }
};
DrawingEditor.prototype.getCurrentDraw = function(){
    return this.currDrawType;
};


// Indicates whether or not the user is drawing a selection rectangle
DrawingEditor.prototype.isMultiSelecting = function(){
    return this.multiselecting;
};
DrawingEditor.prototype.setMultiSelecting = function(val){
    this.multiselecting = val;
};
DrawingEditor.prototype.drawSelectionRectangle = function(){
    var context = this.getDrawingContext();
    // Figure out the top left corner of the rectangle
    var x = Math.min(this.selectionStartX, this.selectionEndX);
    var y = Math.min(this.selectionStartY, this.selectionEndY);

    // Calculate the width and height of the rectangle
    var width = Math.abs(this.selectionEndX - this.selectionStartX);
    var height = Math.abs(this.selectionEndY - this.selectionStartY);

    //save stroke width
    var sw = context.lineWidth;

    context.lineWidth = 1;
    // Draw the rectangle
    context.strokeRect(x, y, width, height);

    //restore stroke width
    context.lineWidth = sw;
};


// See if _shape is in the user dragged rectangle
DrawingEditor.prototype.selectShapesInRectangle = function(){

    // Get the bounds of the drawn rectangle
    var selectionTop = Math.min(this.selectionStartY, this.selectionEndY);
    var selectionBottom = Math.max(this.selectionStartY, this.selectionEndY);
    var selectionLeft = Math.min(this.selectionStartX, this.selectionEndX);
    var selectionRight = Math.max(this.selectionStartX, this.selectionEndX);

    var selshapes = []; 	//selected shapes
    var allshapes = this.getAllShapes();

    // Loop through all the boxes and select if it lies within the
    // bounds of the rectangle
    for (var i = 0; i < allshapes.length; i++) {
        var _shape = allshapes[i];

        var boxTop = _shape.y;
        var boxBottom = _shape.y + _shape.h;
        var boxLeft = _shape.x;
        var boxRight = _shape.x + _shape.w;

        if (boxTop >= selectionTop && boxBottom <= selectionBottom && boxLeft >= selectionLeft && boxRight <= selectionRight)
        {
            //add to selected shapes array
            selshapes.push(_shape);
        }
    }

    //here we check if more than one shapes are selected
    //todo: more than one, how to group?
    switch (selshapes.length){
        case 0:
            return;
            break;
        case 1:
            selshapes[0].select();
            break;
        default:
            selshapes[0].select();
            break;
    }
};


//checks if any _shape is selected
DrawingEditor.prototype.isAnyBoxSelected = function(){
    var allshapes = this.getAllShapes();

    for (var i=0; i<allshapes.length; i++){
        if (allshapes[i].isSelected())
            return true;
    }
    return false;
};
/**
 * function clearSelectedBoxes: Clear all selected boxes
 *
 **/
DrawingEditor.prototype.clearSelectedBoxes = function(){
    var allshapes = this.getAllShapes();
    for (var i=0; i<allshapes.length; i++){
        if (allshapes[i].isSelected()){
            allshapes[i].unselect();
        }
    }
    this.invalidate();
};

/**
 * deleteSelectedBoxes: delete the currently-selected boxes
 */
DrawingEditor.prototype.deleteSelectedShapes = function(){
    var allshapes = this.getAllShapes();

    for (var i=0, l=allshapes.length; i < l; i++)
    {
        var thebox = allshapes[i];
        if (thebox.isSelected())
        {
            //publishDistData('delshape',null,{shpid: thebox.shpid} );  //todo
            allshapes.splice(i,1,null);	//insert a null val
        }
    }
    //..then remove the nulls
    var remainingshapes = allshapes.filter(function(val) {
        return val !== null;
    });
    this.setShapes(remainingshapes);

    this.invalidate();
};

DrawingEditor.prototype.deleteAllShapes = function(){
    var allshapes = this.getAllShapes();

    for (var i=0, l=allshapes.length; i < l; i++)
    {
        var thebox = allshapes[i];
        publishDistData('delshape',null,{shpid: thebox.shpid} );    //todo: deletedshape
        allshapes.splice(i,1,null);	//insert a null val
    }
    //..then reset the array
    this.setShapes([]);

    this.invalidate();
};
// Get _shape of id
DrawingEditor.prototype.getBox = function(shpid){
    var allshapes = this.getAllShapes();

    for (var i=0; i<allshapes.length; i++)
    {
        var _shape = allshapes[i];
        if (_shape.shpid === shpid)
            return _shape;
    }
    return null;
};
// Get selected boxes
DrawingEditor.prototype.getSelectedBoxes = function(){
    var allshapes = this.getAllShapes();

    var arr = [];
    for (var i=0; i<allshapes.length; i++)
    {
        var _shape = allshapes[i];
        if (_shape.isSelected())
            arr.push(_shape);
    }
    return arr;
};

//select all boxes
DrawingEditor.prototype.selectAllBoxes = function(){
    var allshapes = this.getAllShapes();
    allshapes.forEach(function(_shape){
        _shape.select();
    });
    this.invalidate();
};

/**
 *  Sets mx,my to the mouse position relative to the canvas bounds
 *  unfortunately this can be tricky, we have to worry about padding and borders
 */
DrawingEditor.prototype.getMouse = function(e){
    var element = this.getCanvas();

    this.offsetX = 0; this.offsetY = 0;
    if (element.offsetParent) {
        do {
            this.offsetX += element.offsetLeft;
            this.offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    this.offsetX += this.stylePaddingLeft;
    this.offsetY += this.stylePaddingTop;

    this.offsetX += this.styleBorderLeft;
    this.offsetY += this.styleBorderTop;

    //calculate the actual x and y mouse co-ordinates
    this.mx = e.pageX - this.offsetX;
    this.my = e.pageY - this.offsetY;

    // Calculate the change in mouse position for the last
    // time getMouse was called, useful in mouse move updates
    this.changeInX = this.mx - this.lastMouseX;
    this.changeInY = this.my - this.lastMouseY;

    // Store the current mouseX and mouseY positions
    this.lastMouseX = this.mx;
    this.lastMouseY = this.my;

    return {x: this.mx, y: this.my};
};
/**
 * Returns the last known x coordinates of the mouse
 * @returns {number|*}
 */
DrawingEditor.prototype.getMouseX = function(){
    return this.lastMouseX;
};
/**
 * Returns the last known y coordinates of the mouse
 * @returns {number|*}
 */
DrawingEditor.prototype.getMouseY = function(){
    return this.lastMouseY;
};

/**  function normalizeMouseXY: helper function to calibrate the mouse x and y
 * 	coordinates cross-browser
 *  	see *http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element
 */
DrawingEditor.prototype.normalizeMouseXY = function(e){
    var canvas = this.getCanvas();

    var x;
    var y;
    if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
    }
    else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; //document - js global var
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    // x and y contain the mouse position r
    // Do something with this information
    return [x,y];
};

// Multi select function to draw the multi-select rectangle
DrawingEditor.prototype.drawSelectionRectangle = function() {
    var context = this.getDrawingContext();

    context.strokeStyle = "rgb(200,0,0)";

    // Figure out the top left corner of the rectangle
    var x = Math.min(this.selectionStartX, this.selectionEndX);
    var y = Math.min(this.selectionStartY, this.selectionEndY);

    // Calculate the width and height of the rectangle
    var width = Math.abs(this.selectionEndX - this.selectionStartX);
    var height = Math.abs(this.selectionEndY - this.selectionStartY);

    //save stroke width
    var sw = context.lineWidth;

    context.lineWidth = 1;
    // Draw the rectangle
    context.strokeRect(x, y, width, height);

    //restore stroke width
    context.lineWidth = sw;
};

/**
 * used to easily initialize a new shape,
 * add it, and invalidate the canvas
 */
DrawingEditor.prototype.addShape = function(x, y, w, h, fill, sel, rectid, type, strokecol, strokew, angle) {
    var rect;
    var allshapes = this.getAllShapes();
    var self = this;

    switch (type) {
        case 'line':
            rect = new shapes.Line(x,y,w,h);
            break;
        case 'ellipse':
            rect = new shapes.Ellipse(x,y,w,h);
            break;
        case 'crect':
            rect = new shapes.CircularRectangle(x,y,w,h);
            break;
        case 'rect': default:
        rect = new shapes.Shape(x,y,w,h);
        break;
    }

    //fill
    if (fill === '')
        rect.setFill('');	//transparent fill
    else
    if (fill) rect.setFill(fill);	//arg fill
    else
        rect.setFill(this.shapeFillColor);	//global fill

    rect.strokecolor = strokecol || this.shapeLineColor;
    rect.strokewidth = strokew || this.shapeLineWeight;
    //roatation angle
    if (angle)
        rect.angle = angle;

    if (sel) { rect.select(); } else { rect.unselect(); }

    //shape id
    rect.shpid = rectid || rect.shpid;

    rect.setCanvas(this);


   //mingo functions
    var shapegrp = mingolib.GroupObject(rect ,{
        //the rule to assert to midas for this grp. note: \ is string newline in js
        startRule: Mingo.rule("startRule",
            '(Invoked (fn "mouseDown") (dev ?d1) (args ?a1) (time ?on1) (receiver ?thisobj)) '+
            '(Invoked (fn "mouseDown") (dev ?d2) (args ?a2) (time ?on2) (receiver ?thisobj)) '+
            '(test (neq ?d1 ?d2)) '+
            '(test (time:within ?on1 ?on2 1000)) '+  //!!
            '(not (startDM (dev1 ?d1) (time ?on1) (receiver ?thisobj))) '+
            '(not (and (Invoked (fn "mouseUp") (dev ?d1) (args ?a3) (time ?on3) (receiver ?thisobj)) '+
            '(test (time:before ?on2 ?on3)))) '+
            '=> '+
            '(printout t "startDM asserted" crlf) '+
            //'(assert (startDM (dev1 ?d1) (dev2 ?d2) (time ?on1) (args ?a1) (receiver ?thisobj))) '+
            '(assert (startDM (dev1 ?d1) (time ?on1) (args ?a1) (receiver ?thisobj))) '+
            '(call (args ?a1))'),
        bodyRule: Mingo.rule("bodyRule",
            '(startDM (dev1 ?d1) (dev2 ?d2) (receiver ?thisobj)) ' +
            '(not (or (endDM (dev1 ?d1) (dev2 ?d2) (receiver ?thisobj)) ' +
            '		  (endDM (dev1 ?d2) (dev2 ?d1) (receiver ?thisobj)))) ' +
            '(Invoked (fn "mouseMove") (args ?a) (time ?on) (dev ?dm) (receiver ?thisobj)) ' +
            '(test (or (eq ?dm ?d1) (eq ?dm ?d2))) ' +
            '=> ' +
            '(assert (bodyDM (dev1 ?d1) (dev2 ?d2) (args ?a) (receiver ?thisobj))) ' +
            '(call (args ?a))'),
        endRule: Mingo.rule("endRule",
            '(startDM (dev1 ?d1) (dev2 ?d2) (time ?don) (receiver ?thisobj)) ' +
            '(Invoked (fn "mouseUp") (dev ?dx) (args ?a) (time ?on1) (receiver ?thisobj)) ' +
            '(test (or (eq ?dx ?d1) (eq ?dx ?d2))) ' +
            '(not (endDM (dev1 ?d1) (dev2 ?d2) (time ?don) (receiver ?thisobj))) ' +
            '=> ' +
            '(printout t "endDM asserted" crlf) ' +
            '(assert (endDM (dev1 ?d1) (dev2 ?d2) (time ?on1) (args ?a) (receiver ?thisobj))) ' +
            '(call (args ?a))')
    });

    shapegrp.on("startRule", function(args){
        console.log("Start rule collab called ");
        console.dir(args);
    });

    shapegrp.on("bodyRule", function(args){
        console.log("Body rule collab called ");
        console.dir(args);
        self.collabDrag(this, args);
    });

    shapegrp.on("endRule", function(args){
        console.log("End rule called ");
        console.dir(args);
    });

    //replicate an action. shape move.
    shapegrp.replicateAction('move');
    shapegrp.replicateAction('resize');
    shapegrp.replicateAction('setFill');

    //add to allshapes array
    allshapes.push(rect);

    this.invalidate();

    return rect;
};

/**
 * receive shape + event from extended canvas
 * add it, and invalidate the canvas
 */
DrawingEditor.prototype.createOrUpdateShape = function(deviceid, properties) {
    //x, y, w, h, fill, sel, rectid, type, strokecol, strokew, angle
   var x = properties.x, y = properties.y, w = properties.w, h = properties.h;

    var fill = properties.fill, sel = properties.sel, rectid = properties.rectid, type= properties.type,
        strokecol = properties.strokecol,
        strokew = properties.strokew, angle=properties.angle;

    var allshapes = this.getAllShapes();

    //try to get it if it exists
    var rect = this.getBox(rectid);

    if (!rect){
        switch (type) {
            case 'line':
                rect = new shapes.Line(x,y,w,h);
                break;
            case 'ellipse':
                rect = new shapes.Ellipse(x,y,w,h);
                break;
            case 'crect':
                rect = new shapes.CircularRectangle(x,y,w,h);
                break;
            case 'rect': default:
            rect = new shapes.Shape(x,y,w,h);
            break;
        }
        rect.shpid = rectid || rect.shpid;
        rect.unselect();
        allshapes.push(rect);
    } else {
        rect.update(x, y, w, h);
    }

    //fill
    if (fill === '')
        rect.setFill('');	//transparent fill
    else
    if (fill) rect.setFill(fill);	//arg fill
    else
        rect.setFill(this.shapeFillColor);	//global fill

    rect.strokecolor = strokecol || this.shapeLineColor;
    rect.strokewidth = strokew || this.shapeLineWeight;

    //rotation angle
    if (angle)
        rect.angle = angle;

    //move the shape according to the received side
    if (deviceid > this.deviceid)
       rect.x = rect.x + this.width;
    if (deviceid < this.deviceid)
        rect.x = rect.x - this.width;

    this.invalidate();

    return rect;
};

/* ------------------- shape properties functions -------------------- */

// change the fill color of selected shapes or next shapes
DrawingEditor.prototype.changeFill = function(col){
    this.shapeFillColor = col;

    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.setFill(col);
            //distribute -todo
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
};

// change the border color of selected shapes or next shapes
DrawingEditor.prototype.changeBorderColor = function(col){
    this.shapeLineColor = col;
    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.strokecolor = col;
            //distribute - todo
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
};

//change the border width of selected shape/next shapes
DrawingEditor.prototype.changeShapeBorderWidth = function(width){
    switch (width) {
        case 'thick':
            this.shapeLineWeight = 4;
            break;
        case 'medium':
            this.shapeLineWeight = 3;
            break;
        case 'thin': default:
        this.shapeLineWeight = 2;
        break;
    }
    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.strokewidth = shapeBorderWidth;
            //distribute - todo
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
};

//----------------- session stuff ------------------------------
//save the session to the server. a room is a session - as per reqs
DrawingEditor.prototype.saveSession = function(rname){
    var allshapes = this.getAllShapes();
    //ajax call
    //clone shapes
    var boxes3 = allshapes.map(function(_shape){
        return {x: _shape.x, y: _shape.y, w: _shape.w, h: _shape.h, fill: _shape.fill,
            shpid: _shape.shpid, type:_shape.type, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth};
    });
    //stringify
    var boxesJson = JSON.stringify(boxes3);
    //remote save
    utils.remoteCall("ajax","request=savesession&rname="+rname+"&data="+boxesJson,function (reply) {
        if(reply.success === true) {
            alert("Session saved successfully");
        }else {
            alert("A problem occurred when saving");
        }
    });
};

DrawingEditor.prototype.loadSession = function(rname){
    var self = this;
    //ajax call
    utils.remoteCall("ajax","request=loadsession&rname="+rname,function (reply) {
        if(reply.success === true && reply.data !== '') {
            self.loadShapesFromJson(reply.data);
            alert("Session loaded successfully");
        }else {
            //do sthng
        }
    });
};

DrawingEditor.prototype.loadShapesFromJson = function(json){
    var self = this;
    var objects = JSON.parse(json);
    objects.forEach(function(obj){
        var rect = self.addShape(obj.x, obj.y, obj.w, obj.h, obj.fill,
            false, obj.shpid,obj.type,obj.strokecolor, obj.strokewidth);

    });
};
DrawingEditor.prototype.showMsg = function(msg){
    document.getElementById('logger').innerHTML += msg;
};

//-------------- shape properties -------------------------------------

// change the fill color of selected shapes or next shapes
DrawingEditor.prototype.changeFill = function(col){
    this.shapeFillColor = col;
    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.setFill(col);
            //distribute - todo
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
};

// change the border color of selected shapes or next shapes
DrawingEditor.prototype.changeBorderColor = function(col){
    this.shapeLineColor = col;
    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.strokecolor = col;
            //distribute
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
}

//change the border width of selected shape/next shapes
DrawingEditor.prototype.changeBorderWidth = function(width){
    this.shapeLineWeight = width;
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
    var selboxes = this.getSelectedBoxes();
    if (selboxes.length> 0){
        for (var i=0; i<selboxes.length; i++){
            var _shape = selboxes[i];
            _shape.strokewidth = shapeBorderWidth;
            //distribute -tdodo
            //publishDistData('editshapeprops',null,{shpid: _shape.shpid, fill: _shape.fill, strokecolor: _shape.strokecolor, strokewidth: _shape.strokewidth} );
        }
        this.invalidate();
    }
};

/**
 * Get the current stroke color for the editor
 * @returns {string|*}
 */
DrawingEditor.prototype.getLineColor = function(){
    return this.lineColor; //optionally can use canvas.context.strokestyle
};
DrawingEditor.prototype.setLineColor = function(color){
    return this.lineColor = color || ''; //optionally can use canvas.context.strokestyle
};

/**
 * Default mousedown event
 * @param e
 */
DrawingEditor.prototype.mouseDownDefault = function(e){
    var mouse = this.getMouse(e);
    var allshapes = this.getAllShapes();

    //publishMouseEvent(e,BIRTH); todo

    //check if we are over a selection shape
    if (this.expectResize !== -1) {
        this.isResizeDrag = true;
        return;
    }

    var l = allshapes.length;

    //loop - check what has been hit
    for (var i = l-1; i >= 0; i--) {
        var _shape = allshapes[i];

        // Determine if the _shape was clicked
        if (_shape.isHit(this.mx,this.my)&& !this.isDrawing()){
            // we hit a shape
            // if this shape is not selected then select it only
            // since we are sure this is not a multi select here

            if (!_shape.isSelected()) {
                this.clearSelectedBoxes();
            }
            _shape.mouseDown(e);

            this.isDrag = true;
            this.invalidate();

            return;
        }
    }

    //we may be drawing a shape now
    if (this.isDrawing()){
        // for this method width and height determine the starting X and Y, too.
        // are vars in case we wanted to make them args/global for varying sizes
        var width = 2;
        var height = 2;
        var rect = this.addShape(this.getMouseX() - (width / 2), this.getMouseY() - (height / 2), width, height, null, true, null, this.getCurrentDraw());
        console.log("Created shape in mouse down of id " + rect.shpid);
        this.isResizeDrag = true;
        //set dragging handle to 7
        this.expectResize = 7;

        //publishDistData('addshape',e,rect);

        return;
    }

    // if code reaches this point,
    // means we have selected nothing
    this.clearSelectedBoxes();

    //1. we are not drawing anything
    this.setCurrentDraw('');
    this.setDrawing(false);

    // invalidate because we might need the selection border to disappear
    this.invalidate();

};

DrawingEditor.prototype.mouseMoveDefault = function(e){
    //report to midas
    //publishMouseEvent(e,MOVE);
    //store some global vars
    this.getMouse(e);

    var allshapes = this.getAllShapes();

    //move means we are updating sthng that is selected
    for (var i=0; i<allshapes.length; i++){
        var _shape = allshapes[i];
        if (_shape.isSelected()){
            if (this.isDragging()) {
                //if shift is pressed, rotate
                //debugger;
                if (e.shiftKey){
                    _shape.rotate(this.getMouseX(),this.getMouseY());
                }else{
                    _shape.mouseMove(this.changeInX,this.changeInY,e);
                }

            } else if (this.isResizeDrag) {
                _shape.mouseMove(this.getMouseX(),this.getMouseY(),e,this.expectResize);
                break;
            }
        }
    }

    // if there's a selection see if we grabbed one of the selection handles
    if (this.isAnyBoxSelected() && !this.isResizeDrag) {

        var selBoxes = this.getSelectedBoxes();

        //find out selected handle from all objects
        for (i = 0; i < selBoxes.length; i++) {
            var cur = selBoxes[i];
            var curhandle = cur.getSelectedHandle(this.getMouseX(),this.getMouseY());
            // 0  1  2
            // 3     4
            // 5  6  7
            if ( curhandle !== -1){
                // we found one!
                this.expectResize = curhandle;
                this.invalidate();

                //change cursor - doesnt work in some browsers
                switch (curhandle) {
                    case 0:
                        this.getCanvas().style.cursor='nw-resize';
                        break;
                    case 1:
                        this.getCanvas().style.cursor='n-resize';
                        break;
                    case 2:
                        this.getCanvas().style.cursor='ne-resize';
                        break;
                    case 3:
                        this.getCanvas().style.cursor='w-resize';
                        break;
                    case 4:
                        this.getCanvas().style.cursor='e-resize';
                        break;
                    case 5:
                        this.getCanvas().style.cursor='sw-resize';
                        break;
                    case 6:
                        this.getCanvas().style.cursor='s-resize';
                        break;
                    case 7:
                        this.getCanvas().style.cursor='se-resize';
                        break;
                }
                return;
            }
        }
        // not over a selection shape, return to normal
        this.isResizeDrag = false;
        //no selection handle hit
        this.expectResize = -1;
        //return cursor to normal
        this.getCanvas().style.cursor='auto';

    }
    //------------ end multi select --------------------------

};

DrawingEditor.prototype.mouseUpDefault = function(e){
    console.log("Mouse up..");
    //normalize coordinates relative to canvas
    this.getMouse(e);

    var allshapes = this.getAllShapes();
    var i, l;

    //report to midas
    //publishMouseEvent(e,DEATH);

    this.setisDragging(false);

    this.isResizeDrag = false;

    this.expectResize = -1;

    // we finished multiselecting by doing a mouse up
    if (this.isMultiSelecting()) {
        // Reset the selection rectangle, makes it disappear
        this.selectShapesInRectangle();
        this.setMultiSelecting(false);
        this.selectionStartX = 0;
        this.selectionStartY = 0;
        this.selectionEndX = 0;
        this.selectionEndY = 0;
    }
    //if we are still drawing shapes after mouseup, deselect all
    if (this.getCurrentDraw() !== ''){
        this.clearSelectedBoxes();
    }

    //mouse up on which shape?
    for (i = 0, l = allshapes.length; i < l; i++){
        var _shape = allshapes[i];
        if (_shape.isHit(this.getMouseX(), this.getMouseY())){
            _shape.mouseUp(this.getMouseX() ,this.getMouseY(),e);
            break;
        }
    }

    //end multi select part
    this.invalidate();
};

/* ------------------- collaborative functions ---------------------- */

// Indicates whether or not the user is drawing a selection rectangle
DrawingEditor.prototype.isDistributedEvent = function(){
    return this.isDistEvent;
};
DrawingEditor.prototype.setIsDistributedEvent = function(val){
    this.isDistEvent = val;
};

/**
 * function collabDrag: handle the collab drag event
 * @param data: The set of arguments for the event
 **/
DrawingEditor.prototype.collabDrag = function(shape, data){

    if (!shape){
        return;
    }
    //application logic - handle dist resize event
    var evtdata;
    //get the data of the other participant <- maybe you shld remove this part
    for (var i = 0; i < data.length; i++){

        var	evtdata = data[i];
        if (!evtdata)
            continue;

        var box = shape;
        // var box = this.getBox(evtdata.receiver);
        //if (!box){
        //    continue;
        //}

        //calculations for dist resize based on selection handle
        var right =  box.x + box.w;
        var bottom = box.y + box.h;

        //check if the mouse is within the bounds of shape,
        //(note; also allow if it passes by an offset)
        var offset = 50;
        var xy = [];
        var e = evtdata.args.e;
        if (e.clientX){
            xy = this.normalizeMouseXY(e);
        }
        //determine if the mouse is within the bounds of the shape
        //if (mx >= (box.x - offset) && mx <= (right + offset)
        //	&& my >= (box.y-offset) && my <= (bottom + offset)) {

        //set the status todo: find a better way to set them..
        //this.setisDragging(false);
        //this.isResizeDrag = true;
        this.setIsDistributedEvent(true);

        /*
         */
        //choose the correct resize handle ???????

        //var idx = evtdata.args.idx;
        var myx = xy[0] || evtdata.args.x;
        var myy = xy[1] || evtdata.args.y;
        if (myx < 3 || myy < 3){
            return;
        }
        console.info(">>expected resize in args: "+ evtdata.args.idx);
        //if (idx === undefined || idx === -1){
        //get the eucl. distance to determine..
        //..how near the remote mouse is to the sel handles
        var leastDist = 99999, idx = -1;
        for (i=0; i<box.selectionhandles.length; i++){
            var handle = box.selectionhandles[i];
            var dist = Math.sqrt((myx - handle.x) *(myx - handle.x) + (myy - handle.y) * (myy - handle.y));
            //check least dist, also idx
            //idx now holds the current nearest selection handle index
            if (dist < leastDist){
                leastDist = dist;
                idx = i;
            }
        }
        //}

        //opposite resize only
        switch(idx){
            case 0:
            case 5:
                idx = 3;
                break;
            case 2:
            case 7:
                idx = 4;
                break;
        }
        console.log(">>resized shape..." + idx);
        //resize shape
        box.resize(idx, myx, myy);
        this.invalidate();
        //}
    }
};