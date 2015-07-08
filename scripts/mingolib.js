/**
 * Created by ken on 13/05/15.
 */
//requires utils.js

Mingo = (function(){

    var constants = {
        REGISTER_RULE: 'register_sequence',
        CREATE_GROUP_OBJECT: 'create_group_object',
        NEW_GROUP_OBJECT: 'new_group_object',
        COLLABRULE_CALLBACK: 'sequence_callback',
        ACTION_INVOKED: 'fn_invoked',

        REG_REPLICATE_EVENT: 'reg_replicate_event',
        ASSERT_EVENT: 'assert_event',
        RECEIVE_REPLICATED_EVENT: 'receive_replicated_event',
        JOIN_ROOM: 'join_room',

        OLDFN_PREFIX: '___',
        THIS_OBJ: 'thisobj'
    };

    var leadersocket, devicesession, deviceid;

    /**
     * The grup object, wraps the obj with mingo group obj
     * @param obj
     * @param ruleobj = can have start, body and end parts
     * @constructor
     * @param grpid
     */
    var GroupObject = function(obj, ruleobj, grpid){

        //give it a unique shape id (if grpid is 0 it will generate new id tho)
        this.groupObjId = grpid || utils.generateRandomID("GRP_");
        this.obj = obj;
        obj.__groupObj = this;

        /*
        //create this obj to all in session
        leadersocket.emit(constants.CREATE_GROUP_OBJECT, devicesession, function (err, data) {
            //do sthng
        });
        */

        //need to call apply interceptions - what if more than one obj is given?
        this._applyInterceptions(obj, ruleobj);

        //extend this object with the rule object passed
        if (ruleobj){
            Object.extend(obj, ruleobj);
        }

        //methods to get/set groupid
        this._addGroupMethods(this.obj);

        //can add ot this grp obj, or to shape obj
        this.on = this._createOn();

    };


    /**
     * Adds the wrappers for the collab rules.
     * @param o - the object
     * @param r - the array containing mingo rules {{ 'start': {rulename: 'name', rule: ''}}, ,...}
     * @private
     */
    GroupObject.prototype._applyInterceptions = function(o, r){

            var func, err, i, l, rules = [], seqcb, invokeArr =[];

        //reference thisgroupobj
        var thisGroupObj = this;

        //get the properties on the object - currently
        var properties = [];
        if (!o || !r) {
            return;
        }
        for (key in o) {
            properties.push(key);
        }

        //filter fns only. note: filter fn has to exist
        var fnproperties = properties.filter(function(prop){
            //for this scenario, check if its a function and starts with mouse
            return typeof o[prop] === "function"; //&& (prop.lastIndexOf("mouse", 0) === 0);
        });

        //get the properties in rulestr. We have to parse the string
        var ruleStateKeys = Object.keys(r);
        var ruleStateStrs = ruleStateKeys.map(function(ruleStateKey){
            var ruleState = r[ruleStateKey];
            return ruleState.rule || '';
        });

        //we have the rulestrs, now parse them
        var fnsToIntercept = ruleStateStrs.map(function(ruleStr){
            var fns = thisGroupObj._parseruleStr(ruleStr);
            return fns;
        });

        fnsToIntercept = utils.flattenArray(fnsToIntercept);
        fnsToIntercept = utils.uniqueArray(fnsToIntercept);

        //vallues in tags
        //console.log("o in gfproxyis: ");
        //console.dir(o);
        for ( i = 0, l = fnsToIntercept.length; i < l; i++ ){

            fnname = fnsToIntercept[i];
            func = o[fnname];

            //check if it is a function - might not need this
            //if (typeof func !== "function") continue;

            // parse function params
            var params = utils.getFunctionParams(func);

            //replace fn with proxy fn
            o[fnname] = ( function (name, fun, receiver, theparams) {	//closure
                var shape = receiver;
                return function() {
                    //receiver is "this" when fn is called. args is in arguments array
                    var self = this, args = Array.prototype.slice.call(arguments);

                    //call proxy
                    return thisGroupObj._proxyFunction.call(thisGroupObj, function() {
                        //remember scope could be lost, so use self var as scope
                        //debugger;
                        return fun.apply(self, args);
                    }, name, args, shape.__getGroupID(), theparams);
                }
            })(fnname, func, o, params);
        }
    };


    /**
     * proxy function that sends to server that an interception has happened
     * @param fn - the function being intercepted
     * @param fnname - the invoked array for the sequence
     * @param args - the 'arguments' array of the invoked function
     * @param rec - the receiving shape
     * @param params - the extracted params of invoked function (string parsed, due to js limits)
     */
    GroupObject.prototype._proxyFunction = function(fn, fnname, args , rec, params){
        var thisGroupObj = this;

        //first format args with their params
        var fnargs = {};

        for (var i = 0, l = args.length; i < l; i++){
            //first check if param is defined
            if (!params[i]){
                //if not, create new param name for this arg
                params[i] = 'arg_'+ i;
            }
            //limitation: need to remove/format js event object in the event args for serialization
            if  (utils.isEvent(args[i])){   //need to also check if mouse event?
                var e = args[i];
                //use this to avoid cyclic event object unsupported by JSON
                var basicEventOpts = {
                    pointerX:  e.pointerX,
                    pointerY:  e.pointerY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    button: e.button,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    bubbles: e.bubbles,
                    cancelable: e.cancelable
                };

                //WE NEED TO FIX THE X AND Y VALUES SENT AND RECEIVED ONCE A COLLAB RULE IS ACTIVATED.
                //DO WE NEED TO CALCULATE THEM?
                //get the proper x and y values from event object
                //see http://stackoverflow.com/questions/12704686/html5-with-jquery-e-offsetx-is-undefined-in-firefox
                //var xy = this.normalizeMouseXY(basicEventOpts);
                //basicEventOpts.mouseX = xy[0]; basicEventOpts.mouseY = xy[1];

                //add to params
                //fnargs['x'] = xy[0];
                //fnargs['y'] = xy[1];

                fnargs[params[i]] = basicEventOpts;
            } else {
                //todo: may need to strip whitespace
                fnargs[params[i]] = args[i];
            }
        }

        var interception = {
            //'fn': fn,			//the intercepted function
            name: fnname,		//its name
            rec: rec,			//the receiver:
            args: fnargs,		//its arguments
            session: devicesession
        };
        leadersocket.emit(constants.ACTION_INVOKED, interception, function (err, data) {
            if (!data.isseqcb){
                //call the normal (invoked) function call: fn.
                fn.call(thisGroupObj.obj, data.args);    //or get the shape some other way?
            }
        });
    };

    /**
     * Creates a wrapper on the action that sends a repl event to the sever everytime it is called
     * @param fn
     * @param fnname
     * @param args
     * @param rec
     * @param params
     * @private
     */
    GroupObject.prototype._replicateActionWrapper = function(fn, fnname, args , rec, params, createnew){
        var thisGrouObj = this;
        var groupid = null;

        //call the action locally
        var result =  fn.apply(thisGrouObj.obj, args);    //can also get shape by gid

        //object creation methods HAVE TO return it
        if (createnew === true){
            //is it a group object?
            var temp = result.__getGroupObject ? result.__getGroupObject() : null;
            if (!temp) {
                // if not, create new group object with it
                temp = new GroupObject(result);
            }

            groupid = temp._getID();
        }

        //first format args with their params
        var fnargs = {};

        for (var i = 0, l = args.length; i < l; i++){
            //first check if param is defined
            params[i] = params[i] == undefined ? 'arg_'+ i : params[i].trim();

            //limitation: need to remove/format js event object in the event args for serialization
            if (utils.isEvent(args[i])){   //need to also check if mouse event?
                var e = args[i];
                //use this to avoid cyclic event object unsupported by JSON
                var basicEventOpts = {
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

                //get the proper x and y values from event object <- depends on canvas!
                //see http://stackoverflow.com/questions/12704686/html5-with-jquery-e-offsetx-is-undefined-in-firefox
                var xy = this.obj.normalizeMouseXY(basicEventOpts);

                basicEventOpts.mouseX = xy[0]; basicEventOpts.mouseY = xy[1];

                //add to params
                //fnargs['x'] = xy[0];
                //fnargs['y'] = xy[1];

                fnargs[params[i]] = basicEventOpts;
            } else {
                fnargs[params[i]] = args[i];
            }
        }

        var actionData = {
            action: fnname,		//its name
            receiver: rec,		//the receiver:
            params: params,     //param names (or arg_x if not)
            args: fnargs,		//its arguments
            argsarray: args,
            grpid: groupid,   //the target grp id could be different from receiver
            session: devicesession   //the session
        };

        leadersocket.emit(constants.ASSERT_EVENT, fnname, actionData, function (err, data) {
            //ack from server
            //console.log("Replicate action ack from server: " + data);
        });

        return result;
    };


    /**
     * function createOn: adds 'on' functionality to an object
     */
    GroupObject.prototype._createOn = function(){
        var self = this;

        //this refers to the shape obj
        return 	(function(str, fn){
            if (!self.obj[str]){
                console.log("Groupshape.createOn - property not found: "+str);
                return;
            }
            var temp = self.obj[str];
            var tempkey = str +'#'+self.groupObjId;
            self.obj[tempkey] = temp;

            self.obj[str]  = self.obj[tempkey];

            //if already defined, do nothing.
            if (self.obj[tempkey]["rulefn"])
                return;
            //adds rulefn to define the on callback
            self.obj[tempkey]["rulefn"] = fn;
            self.obj[tempkey]["rulename"] = tempkey;
            //note: at this point the obj has
            //rulename: name, rule: 'rulestr ', rulefn: fn

            //change THISOBJ references to the groupobjid
            var rulestr = self.obj[tempkey]["rule"];
            var pattern= new RegExp("\\?" + constants.THIS_OBJ,"ig");
            self.obj[tempkey]["rule"] = rulestr.replace(pattern,'"'+self.groupObjId+'"');

            //then send the rule to the server
            self.sendRuleToServer(self.obj[tempkey]);

        }).bind(self);  //bind to this group object

    };
    /**
     * add methods to get and set group id
     */
    GroupObject.prototype._addGroupMethods = function(obj) {
        //add a method to set group id
        obj.__setGroupID = function(id){
            var temp = obj.__getGroupObject();
            if (temp) temp._setID(id);
            else throw new Error('Could not get group obj of object' + id)
        };
        obj.__getGroupID = function(){
            var temp = obj.__getGroupObject();
            if (temp) return temp._getID();
            else return null;
        };

        obj.__getGroupObject = function(){
            return obj.__groupObj;
        };

        return obj;
    };

    GroupObject.prototype.sendRuleToServer = function(ruleobj){
        var self = this;
        //send event to leader/server. can add client id here
        leadersocket.emit(constants.REGISTER_RULE, ruleobj.rulename, ruleobj.rule, function (msg) {
            //output the results of the registration of the rule
            //note: this is not the sequence callback
            console.log(msg);
        });

        //collab fn callback - can call using the shape object itself as the "this"
        var seqcb = ruleobj.rulefn;

        //when a sequence has been detected...
        leadersocket.on(constants.COLLABRULE_CALLBACK,function(data){
            //todo: context
            data.forEach(function(val){
                if (!val || !ruleobj || ruleobj !== val.rulename) return;

                return seqcb.call(self.obj, data);
            });
        });
    };

    /**
     * Sends an event to replicate to the server. eventname is the method to call on the object.
     * @param eventname
     * @param eventobject
     */
    GroupObject.prototype.replicateAction = function(eventname, eventobject, isnew){
        if (!leadersocket){
            throw new Error("GroupObject.replicateAction: leadersocket not defined");
        }

        var oldfn = this.obj[eventname];
        if (!oldfn || typeof oldfn !== 'function'){
            throw new Error("GroupObject.replicateAction: action to replicate is not defined: "+ eventname);
        }
        var thisGroupObj = this;
        //event object is the object that this grpobject encapsulates
        if (!eventobject){
            eventobject = this.obj;
        }

        //save ref to the original fn
        this[constants.OLDFN_PREFIX + eventname] = oldfn;

        //wrap the action called
        // parse function params
        var params = utils.getFunctionParams(oldfn);

        //replace fn with wrapper that replicates then calls the method
        eventobject[eventname] = ( function (name, fun, receiver, theparams, newobj) {	//closure
            var shape = receiver;
            return function() {
                //receiver is "this" when fn is called. args is in arguments array
                var self = this, args = Array.prototype.slice.call(arguments);

                return thisGroupObj._replicateActionWrapper.call(thisGroupObj, function() {
                    //remember scope could be lost, so use self var as scope
                    //debugger;
                    return fun.apply(this, args);
                }, name, args, thisGroupObj.groupObjId, theparams, newobj);
            }
        })(eventname, oldfn, eventobject, params, isnew);

        var eventToReplicate = {
            name: eventname,		//its name
            receiver: thisGroupObj.groupObjId,
            session: devicesession
        };

        console.log("Sending event to replicate: " + eventname);
        //add room to it
        eventobject.session = devicesession;
        //send the event to server
        leadersocket.emit(constants.REG_REPLICATE_EVENT, eventname, eventToReplicate, function(err, result){
            if (err)
                console.error("Registered replicate event error for " +eventname +": " + result.msg);
            else
                console.log("Registered to replicate event: " + eventname);
        });

    };


    /**
     * Parses the rule str to find the matches for "fn"
     * @param str
     * @returns {Array}
     * @private
     */
    GroupObject.prototype._parseruleStr  = function(str){

        var result = [];

        //https://regex101.com/r/vE9xF5/1
        var regex = /(?:^|\s|\()fn(?:\s*)(?:'|")(.*?)(?:'|")(?:\s|\))/g;
        var match = regex.exec(str);
        while (match != null) {
            // matched text: match[0]
            // match start: match.index
            // capturing group n: match[n]
            var matchedfn = match[1];
            if (result.indexOf(matchedfn) === -1) {
                result.push(match[1]);
            }
            match = regex.exec(str);
        }
        return result;

    };
    GroupObject.prototype._setID = function(newid){
        this.groupObjId = newid;
    };
    GroupObject.prototype._getID = function(){
        return this.groupObjId;
    };


    var MingoConstructor = function(session, socket){

        var self = this;
        this.grpObjects = [];

        this.init = function(soc, ses){
            //add touch events to document as well
            utils.touchToMouse();

            this.leadersocket = soc;
            leadersocket = soc; //todo:
            devicesession = ses;
            //replicate action request received


            this.leadersocket.on(constants.RECEIVE_REPLICATED_EVENT, function(data){
                //console.log("Replicated action detected from server " + data.name);

                var receiver = null;
                if (!data.name){
                    throw new Error("mingolib.receivereplicateAction: action not defined" + data.name);
                }

                receiver = self.getGroupObject(data.receiver);

                //if receiver is not defined then we will assign the id to the data.grpid
                self.receiveReplicateAction.call(receiver, data);
            });


            this.leadersocket.on('test', function (msg){
               console.log("Test message: " + msg);
            });
            /*
            this.leadersocket.on(constants.NEW_GROUP_OBJECT, function(fn, data){
                //call the correct object constructor

                //self.receiveReplicateAction.call(self, data);
            });*/
        };

        this.GroupObject = function(obj, ruleobj, grpid){

            //create the group object
            var newobj = new GroupObject(obj, ruleobj, grpid);

            //->this.newObj obj.constructor.name + arguments.callee

            //then add to array of group shapes
            this.grpObjects.push(newobj);

            return newobj;
        };


        this.receiveReplicateAction = function(result){
            //if (result.device === deviceid){
            //console.log("Received replicated action..." + result.name);

            //get the action
            var action = result.name;

            var receiver = self.getGroupObject(result.receiver);
            if (!receiver){
                //get the receiver
                throw new Error("MingoConstructor.replicateAction: Did not find object of id: " + result.receiver);
            }
            //call original fn
            return_obj = receiver[constants.OLDFN_PREFIX + action].apply(receiver.obj, result.args.argsarray);
            //return receiver.obj[action].apply(receiver.obj, result.args);

            if (result.grpid){
                return_obj.__setGroupID(result.grpid);
            }
            return return_obj;
        };

        this.getGroupObject = function(id){
            var ret = null;
            //get the grp object
            var obj = self.grpObjects.filter(function(obj){
                return obj.groupObjId === id;
            });
            if (obj) { ret = obj[0]; }

            return ret;
        };

        this.init(socket, session);
    };

    MingoConstructor.rule = function(name, rulestr){
        return {rulename: name, rule: rulestr};
    };

    return MingoConstructor;
})();
