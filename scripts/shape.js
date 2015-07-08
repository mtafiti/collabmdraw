/**
 * Created by ken on 07/05/15.
 */
if (typeof shapes === 'undefined'){
    shapes = {};
}

shapes.Shape = (

function(){

    // shape object to hold data
    function ShapeObj(x,y,w,h) {
        this.x = x||0;
        this.y = y||0;
        this.w = w||1; // default width and height?
        this.h = h||1;
        this.selected = false;
        this.fill = this.setFill('#444444'); //this.canvas.shapeFillColor; //'#444444';
        this.strokecolor = '#444444'; //this.canvas.shapeLineColor;
        this.strokewidth = '#444444'; //this.canvas.shapeLineWeight;
        this.angle = 0;

        this.type = 'rect';

        //unique id
        this.shpid = utils.generateRandomID('SHP-');
        //distr-id
        this.distshapeid = '';

        //selection handles for each shape
        this.selectionhandles = [];

        for (var i = 0; i < 8; i ++) {
            var rect = new shapes.SelectionHandle();
            this.selectionhandles.push(rect);
        }
        //can ask to replicate actions here.. or after creating shape
    }

    ShapeObj.prototype.setCanvas = function(canvas){
        this.canvas = canvas;
    };

    // each shape is responsible for its own drawing
    // mainDraw() will call this with the normal canvas
    // myDown will call this
    ShapeObj.prototype.draw = function(){

            if (!this.canvas){
                throw new Error("ShapeObj.draw: The canvas is not defined.");
            }

            var context = this.canvas.getDrawingContext();

            var i = 0, xi, yi;	//x and y temp vals
            context.fillStyle = this.fill;

            // can skip the drawing of elements that have moved off the screen:
            if (this.x > this.canvas.getWidth() || this.y > this.canvas.getHeight()) { return; }
            if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

            context.strokeStyle = this.strokecolor;
            context.lineWidth = this.strokewidth;
            //possible rotate
            if (this.angle != 0){
                context.save();
                //shape center rotate needs canvas translate
                context.translate(this.x+this.w/2, this.y+this.h/2); // Translate to centre of shape
                //also change this.x and this.y
                xi = this.x; yi = this.y;

                this.x = 0 - (this.w/2);
                this.y = 0 - (this.h/2);

                context.rotate(this.angle*(Math.PI/180)); // rotate in radians

            }
        if (this.fill){
                context.fillRect(this.x, this.y, this.w, this.h);
            }
            //draw default outline
            if (!this.selected) {
                context.strokeRect(this.x, this.y, this.w, this.h);
            }

            // draw selection
            // this is a stroke along the _shape and also 8 new selection handles
            if (this.selected) {
                context.strokeStyle = this.canvas.selectionBoxLineColor;
                context.lineWidth = this.canvas.selectionBoxLineWidth;

                context.strokeRect(this.x, this.y, this.w, this.h);

                // draw the boxes

                var half = this.canvas.selectionBoxSize / 2;

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


                context.fillStyle = this.canvas.selectionBoxFillColor;
                for (i = 0; i < 8; i++) {
                    var cur = this.selectionhandles[i];
                    context.fillRect(cur.x, cur.y, this.canvas.selectionBoxSize,this.canvas.selectionBoxSize);
                }
            }

            //if rotate, restore context
            if (this.angle != 0){
                context.restore();
                this.x = xi;
                this.y = yi;
            }

        };

    ShapeObj.prototype.resize = function(handle, mousex, mousey){
            var oldx = this.x;
            var oldy = this.y;
            var newx = oldx - mousex;
            var newy = oldy - mousey;
            //keep track of old values
            var oldvals = {x:this.x, y:this.y, w:this.w, h:this.h};

            switch (handle) {
                case 0:
                    this.x = mousex;
                    this.y = mousey;
                    this.w += newx;
                    this.h += newy;
                    break;
                case 1:
                    this.y = mousey;
                    this.h += newy;
                    break;
                case 2:
                    this.y = mousey;
                    this.w = mousex - oldx;
                    this.h += oldy - mousey;
                    break;
                case 3:
                    this.x = mousex;
                    this.w += oldx - mousex;
                    break;
                case 4:
                    this.w = mousex - oldx;
                    break;
                case 5:
                    this.x = mousex;
                    this.w += oldx - mousex;
                    this.h = mousey - oldy;
                    break;
                case 6:
                    this.h = mousey - oldy;
                    break;
                case 7:
                    this.w = mousex - oldx;
                    this.h = mousey - oldy;
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

            //invalidate canvas
            if (this.canvas)
                this.canvas.invalidate();

            //return the changed ranges
            return {x: this.x - oldvals.x,
                y: this.y - oldvals.y,
                w: this.w - oldvals.w,
                h: this.h - oldvals.h};
        };

    ShapeObj.prototype.rotate = function(mousex,mousey){
            //calculate the angle btn center of shape
            //and the mouse
            var rel = {x: mousex - this.x, y: mousey - this.y};
            var theta = Math.atan2(rel.y, rel.x);

            //non-negative nos
            //if (theta < 0)
            //   theta += 2 * Math.PI;
            this.angle = 180*theta/Math.PI;

            this.canvas.invalidate();
    };

    //get the index of the selected handle of this shape, or -1 if none
    ShapeObj.prototype.getSelectedHandle = function(mx,my){

            for (i = 0, l = this.selectionhandles.length; i < l; i++) {
                var cur = this.selectionhandles[i];

                // selection handles will always be rectangles,
                // so check if we hit this one
                if (mx >= cur.x && mx <= cur.x + this.canvas.selectionBoxSize &&
                    my >= cur.y && my <= cur.y + this.canvas.selectionBoxSize) {
                    //we found a selected handle, return it
                    return i;
                }
            }
            return -1;
    };
        //is this shape hit?
    ShapeObj.prototype.isHit = function(mouseX,mouseY){
            // Determine if the shape was clicked
            var left1 = this.x;
            var right1 = left1 + this.w;
            var top1 = this.y;
            var bottom1 = this.y + this.h;

            if (mouseX >= left1 && mouseX <= right1 && mouseY >= top1 && mouseY <= bottom1) {
                return true;
            }else {
                return false;
            }
    };

    ShapeObj.prototype.select = function(){
            this.selected = true;
    };

    ShapeObj.prototype.unselect = function(){
            this.selected = false;
    };

    ShapeObj.prototype.isSelected = function(){
            return this.selected;
    };

    ShapeObj.prototype.move = function(x,y){
            this.x = this.x + x;
            this.y = this.y + y;
            //invalidate the canvas
            this.canvas.invalidate();
    };

    /**
     * Updates the shape dimensions
     * @param x
     * @param y
     * @param w
     * @param h
     */
    ShapeObj.prototype.update = function(x,y,w,h){
          this.x = x;   
          this.y = y;
          this.w = w;
          this.h = h;

          this.canvas.invalidate();
    };

    ShapeObj.prototype.setFill = function(color){
        this.fill = color;
        this.invalidateCanvas()
    };

    ShapeObj.prototype.invalidateCanvas = function() {
        if (this.canvas){
            this.canvas.invalidate();
        }
    };

        //mouse events
    ShapeObj.prototype.mouseDown = function(e){
            this.select();
    };

    ShapeObj.prototype.mouseMove = function(x,y,e,idx){
            if (this.canvas.isDrag){
                this.move(x,y);
                //publishDistData('editshape',e,this);
            } else if (this.canvas.isResizeDrag) {
                this.resize(idx, x, y);	//use resize handle as 4th arg
                //publishDistData('editshape',e,this);
            }
       this.canvas.invalidate();
    };

    ShapeObj.prototype.mouseUp = function(x,y,e){

            //this.selected= false; uncomment to select a shape
    };

    return ShapeObj;

})();
