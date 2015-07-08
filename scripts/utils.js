//decode get request var

if (typeof utils === 'undefined') utils = {};

utils =
(function(){

    function getQueryString(name){
       if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
          return decodeURIComponent(name[1]);
    }

    function getFunctionParams(fn){
        var reg = /\(([\s\S]*?)\)/;
        var params = reg.exec(fn);
        if (params)
             return params[1].split(',');
        else
            return [];
    }

    /**
     generateRandomID: Utility function to generate random IDs
     @param: start - an optional starting string for the id
     */
    function generateRandomID(start){

        //array of xters to use
        var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

        if(!start)
            start = "SHP_";

        var chars = CHARS, uuid = new Array(36), rnd=0, r;
        for (var i = 0; i < 36; i++) {
            if (i==8 || i==13 ||  i==18 || i==23) {
                uuid[i] = '_';
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

    /**
     *	ajax remote POST call
     *	@param url: the url
     *	@param args: the args to send
     *	@param responseCallback	the callback fn
     */
    function remoteCall(url, args, responseCallback) {
        var http = new XMLHttpRequest();
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

            }
        };
        http.send(args);
    }

    /**
     * function isEvent: serializing mouse event object in javascript is a pain,
     * so use this function to check an intercepted argument is an event. if so, strip it down
     * see: http://stackoverflow.com/questions/1458894/how-to-determine-if-javascript-object-is-an-event
     * to its essentials before sending to the leader
     */
    function isEvent(a){
        var txt, es=false, no = false;
        txt = Object.prototype.toString.call(a).split('').reverse().join('');
        es = (txt.indexOf("]tnevE") === 0)? true: false; // Firefox, Opera, Safari, Chrome
        if(!es && a){
            txt = a.constructor && a.constructor.toString().split('').reverse().join('');
            es = (txt.indexOf("]tnevE") === 0) ? true : false; // MSIE
        }
        return es;
    }

    // Internal implementation of a recursive `flatten` function.
    var _flatten = function(input, shallow, strict, output) {
        output = output || [];
        var idx = output.length;
        for (var i = 0, length = input.length; i < length; i++) {
            var value = input[i];
            if (Array.isArray(value) /* also check arguments objects */) {
                //flatten current level of array or arguments object
                if (shallow) {
                    var j = 0, len = value.length;
                    while (j < len) output[idx++] = value[j++];
                } else {
                    _flatten(value, shallow, strict, output);
                    idx = output.length;
                }
            } else if (!strict) {
                output[idx++] = value;
            }
        }
        return output;
    };

    // Flatten out an array, either recursively (by default), or just one level.
    //from underscore.js
    function flattenArray(array, shallow) {
        return _flatten(array, shallow, false);
    }

    function uniqueArray(arr)
    {
        var n = {},r=[];
        for(var i = 0; i < arr.length; i++) {
            if (!n[arr[i]]) {
                n[arr[i]] = true;
                r.push(arr[i]);
            }
        }
        return r;
    }

    /**
     * get the css propoerty (computed) requires document, window
     * @param elmId
     * @param property e.g. left, color etc
     * @returns {*}
     */
    function getCssProperty(elmId, property){
        var elem = document.getElementById(elmId);
        return window.getComputedStyle(elem,null).getPropertyValue(property);
    }

    /**
     * Adds a css style in the webpage. requires: document
     * @param name
     * @param rules
     */
    function addCssProperty(name,rules){
        var style = document.createElement('style');
        style.type = 'text/css';
        document.getElementsByTagName('head')[0].appendChild(style);
        if(!(style.sheet||{}).insertRule)
            (style.styleSheet || style.sheet).addRule(name, rules);
        else
            style.sheet.insertRule(name+"{"+rules+"}",0);
    }

    // ---------------- map touch to mouse events --------------------//
    function touchHandler(event)
    {
        var touches = event.changedTouches,
            first = touches[0],
            type = "";
        switch(event.type)
        {
            case "touchstart": type = "mousedown"; break;
            case "touchmove":  type = "mousemove"; break;
            case "touchend":   type = "mouseup";   break;
            default:           return;
        }

        // initMouseEvent(type, canBubble, cancelable, view, clickCount,
        //                screenX, screenY, clientX, clientY, ctrlKey,
        //                altKey, shiftKey, metaKey, button, relatedTarget);

        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(type, true, true, window, 1,
            first.screenX, first.screenY,
            first.clientX, first.clientY, false,
            false, false, false, 0/*left*/, null);

        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    }

    // requires document
    function touchToMouse() {
        document.addEventListener("touchstart", touchHandler, true);
        document.addEventListener("touchmove", touchHandler, true);
        document.addEventListener("touchend", touchHandler, true);
        document.addEventListener("touchcancel", touchHandler, true);
    }

    return {
            generateRandomID: generateRandomID,
            getQueryString: getQueryString,
            getFunctionParams: getFunctionParams,
            remoteCall: remoteCall,
            isEvent: isEvent,
            flattenArray: flattenArray,
            uniqueArray: uniqueArray,
            touchToMouse: touchToMouse,
        addCssProperty: addCssProperty
    };

})();

//polyfill
/**
 *	Object.create - prototypal inheritance.
 *	From: http://javascript.crockford.com/prototypal.html
 *	@param o: the object
 */
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}
if (!Object.extend){
    Object.extend = function(destination, source) {
        for (var k in source) {
            if (source.hasOwnProperty(k)) {
                destination[k] = source[k];
            }
        }
        return destination;
    }
}