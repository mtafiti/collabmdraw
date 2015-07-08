/**
 * Created by ken on 08/05/15.
 */


if (!shapes){
    shapes = {};
}

shapes.SelectionHandle = (function(){
    // shape object to hold data
    function SelHandle(x,y,w,h) {
        this.x = x||0;
        this.y = y||0;
        this.w = 1; // default width and height?
        this.h = 1;
        this.selected = false;
        this.fill = this.canvas ? this.canvas.selectionBoxFillColor : '#444444'; //'#444444';
        this.strokecolor = this.canvas ? this.canvas.selectionBoxLineColor: '#444444';
    }

    SelHandle.prototype.setCanvas = function(canvas){
      this.canvas = canvas;
    };


    // subclass extends superclass
    SelHandle.prototype = Object.create(shapes.Shape.prototype);
    SelHandle.prototype.constructor = SelHandle;

    return SelHandle;
})();
