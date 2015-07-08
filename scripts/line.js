/**
 * File for line functionalities
 * Created by ken on 07/05/15.
 */


if (typeof shapes === 'undefined'){
    shapes = {};
}

shapes.Line = (function(){

    //A line
    function Line(x,y,w,h) {

        //call shapes constructor
        shapes.Shape.call(this, x,y,w,h);


        this.type = 'line';
        this.canvas = null;

    }

    Line.prototype.setCanvas = function(canvas){
        this.canvas = canvas;
    };

    //specialized draw function
    Line.prototype.draw = function(canvas){

        if (!this.canvas){
            throw new Error("Line.draw: The canvas is not defined.");
        }

        var context = this.canvas.getDrawingContext();

        var i = 0;
        context.fillStyle = this.fill;

        // can skip the drawing of elements that have moved off the screen:
        if (this.x > this.canvas.getWidth() || this.y > this.canvas.getHeight()) { return; }
        if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

        context.strokeStyle = this.strokecolor;
        context.lineWidth = this.strokewidth;

        context.beginPath();
        context.moveTo(this.x,this.y);
        context.lineTo(this.x + this.w, this.y+ this.h);
        //ctx.fill();
        context.stroke();
        //context.closePath();

        if (!this.isSelected()) {
            return;
        }
        context.strokeStyle = this.canvas.selectionBoxLineColor;
        context.lineWidth = this.canvas.selectionBoxSize;
        //context.strokeRect(this.line.x, this.line.y, this.line.w, this.line.h);


        var half = this.canvas.selectionBoxSize  / 2;

        //line has its own 2 selection handles, remove the rest
        this.selectionhandles.splice(2, this.selectionhandles.length-2);
        // 0
        //
        //      1
        this.selectionhandles[0].x = this.x - half;
        this.selectionhandles[0].y = this.y - half;
        this.selectionhandles[1].x = (this.x + this.w) - half;
        this.selectionhandles[1].y = (this.y + this.h) - half;

        context.fillStyle = this.canvas.selectionBoxFillColor;
        for (i = 0, l = this.selectionhandles.length; i < l; i++) {
            var cur = this.selectionhandles[i];
            context.fillRect(cur.x, cur.y, this.canvas.selectionBoxSize, this.canvas.selectionBoxSize);
        }
    };

    //specialized resize function for lines - handle represents one of 2 selection handles on object
    Line.prototype.resize = function(handle, mousex, mousey){
        var oldx = this.x, mx = mousex, my = mousey;
        var oldy = this.y;
        var newx = oldx - mx;
        var newy = oldy - my;
        //if expected handle is 7, then change to 1
        if (handle > 1) { handle = 1;}
        switch (handle) {
            case 0:
                this.x = mx;
                this.y = my;
                this.w += newx;
                this.h += newy;
                break;
            case 1:
                this.w = mx - oldx;
                this.h = my - oldy;
                //line.w = -newx;
                //line.h = -newy;
                break;
        }
    };
    /*
     // helper function to calculate if line was hit */
    function getHitDist(mX,mY){
        var x1 = this.x;
        var y1 = this.y;
        var x2 = this.x+this.w;
        var y2 = this.y+this.h;

        var delX = this.w;
        var delY = this.h;
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
    }

    // Determine if the shape was clicked
    Line.prototype.isHit = function(mouseX,mouseY){
        var hitdistance = getHitDist(mouseX,mouseY);

        if (hitdistance === -1 || hitdistance > 4){
            return false;
        }else {
            return true;
        }
    };

    Line.prototype.invalidateCanvas = function() {
        if (this.canvas){
            this.canvas.invalidate();
        }
    };

    // subclass extends superclass
    Line.prototype = Object.create(shapes.Shape.prototype);
    Line.prototype.constructor = Line;

    return Line;
})();
