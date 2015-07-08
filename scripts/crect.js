/*
 * A circular rect
 */


if (typeof shapes === 'undefined'){
    shapes = {};
}

shapes.CircularRectangle = (function(){

function CRectangle(x,y,w,h){

    var crect = Object.create(new ShapeObj(x,y,w,h));
    crect.type = 'crect';
}

    CRectangle.prototype.setCanvas = function(canvas){
        this.canvas = canvas;
    };

CRectangle.prototype.draw = function () {
    if (!this.canvas){
        throw new Error("Crectangle.draw: The canvas is not defined.");
    }

    var context = this.canvas.getDrawingContext();
        var i = 0;
        context.fillStyle = this.fill;

        // can skip the drawing of elements that have moved off the screen:
        if (this.x > this.canvas.getWidth() || this.y > this.canvas.getHeight()) { return; }
        if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

        context.strokeStyle = this.strokecolor;
        context.lineWidth = this.strokewidth;

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


    //context.fillRect(this.x, this.y, this.w, this.h);
        //draw default outline
        if (!this.selected) {
            //context.strokeRect(this.x, this.y, this.w, this.h);
            drawRoundRect(context,this.x,this.y,this.w,this.h);
        }else{
            // draw selection
            // this is a stroke along the shape and also 8 new selection handles
            context.strokeStyle = this.canvas.selectionBoxLineColor;
            context.lineWidth = this.canvas.selectionBoxLineWidth;
            //context.strokeRect(this.x, this.y, this.w, this.h);
            drawRoundRect(context,this.x,this.y,this.w,this.h);

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
                context.fillRect(cur.x, cur.y, this.canvas.selectionBoxSize, this.canvas.selectionBoxSize);
            }
        }
    }; // end draw


CRectangle.prototype.resize =function(handle, mousex, mousey){
        var oldx = this.x;
        var oldy = this.y;
        var newx = oldx - mousex;
        var newy = oldy - mousey;

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
    };
    //get the index of the selected handle of this shape, or -1 if none
CRectangle.prototype.getSelectedHandle = function(mx,my){

        for (i = 0, l = this.selectionhandles.length; i < l; i++) {
            var cur = this.selectionhandles[i];

            // selection handles will always be rectangles,
            // so check if we hit crect one
            if (mx >= cur.x && mx <= cur.x + this.canvas.selectionBoxSize &&
                my >= cur.y && my <= cur.y + this.canvas.selectionBoxSize) {
                //we found a selected handle, return it
                return i;
            }
        }
        return -1;
    };

    CRectangle.prototype.setFill = function(color){
        this.fill = color;
    };

    CRectangle.prototype.invalidateCanvas = function() {
        if (this.canvas){
            this.canvas.invalidate();
        }
    };

    // subclass extends superclass
    CRectangle.prototype = Object.create(shapes.Shape.prototype);
    CRectangle.prototype.constructor = CRectangle;

})();