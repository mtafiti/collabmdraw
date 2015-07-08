/**
 * Created by ken on 08/05/15.
 */

if (typeof shapes === 'undefined'){
    shapes = {};
}

shapes.Ellipse = (

    function(){
    //An ellipse
    function Ellipse(x,y,w,h){

        var ellipse = Object.create(new ShapeObj(x,y,w,h));

        ellipse.type = 'ellipse';

    }

    Ellipse.prototype.setCanvas = function(canvas){
        this.canvas = canvas;
    };

    Ellipse.prototype.draw = function () {

        if (!this.canvas){
            throw new Error("Ellipse.draw: The canvas is not defined.");
        }
        var context = this.canvas.getDrawingContext();

        var i = 0;
        context.fillStyle = this.fill;

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
            if (this.fill) ctx.fill();	//fill with current color
            ctx.stroke();	//draw
        }

        // can skip the drawing of elements that have moved off the screen:
        if (this.x > this.canvas.getWidth() || this.y > this.canvas.getHeight()) { return; }
        if (this.x + this.w < 0 || this.y + this.h < 0) { return; }

        context.strokeStyle = this.canvas.shapeLineColor;
        context.lineWidth = this.canvas.shapeLineWeight;

            //context.fillRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
            //draw default outline
            if (!this.selected) {
                //context.strokeRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
                drawEllipse(context,this.x, this.y, this.w, this.h);
            }else{
                // draw selection
                // this is a stroke along the shape and also 8 new selection handles
                context.strokeStyle = this.canvas.selectionBoxFillColor;
                context.lineWidth = this.canvas.selectionBoxSize;
                //context.strokeRect(ellipse.x, ellipse.y, ellipse.w, ellipse.h);
                drawEllipse(context, this.x, this.y, this.w, this.h);

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


                context.fillStyle = this.canvas.selectionBoxLineColor;
                for (i = 0; i < 8; i++) {
                    var cur = this.selectionhandles[i];
                    context.fillRect(cur.x, cur.y, this.canvas.selectionBoxSize, this.canvas.selectionBoxSize);
                }
            }

        }; // end draw

        //get the index of the selected handle of ellipse shape, or -1 if none
        Ellipse.prototype.getSelectedHandle = function(mx,my){

            for (i = 0, l = this.selectionhandles.length; i < l; i++) {
                var cur = this.selectionhandles[i];

                // selection handles will always be rectangles,
                // so check if we hit ellipse one
                if (mx >= cur.x && mx <= cur.x + this.canvas.selectionBoxSize &&
                    my >= cur.y && my <= cur.y + this.canvas.selectionBoxSize) {
                    //we found a selected handle, return it
                    return i;
                }
            }
            return -1;
        };

        Ellipse.prototype.setFill = function(color){
            this.fill = color;
        };

        // subclass extends superclass
        Ellipse.prototype = Object.create(shapes.Shape.prototype);
        Ellipse.prototype.constructor = Ellipse;

        return Line;

})();
