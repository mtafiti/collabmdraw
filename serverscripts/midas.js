var inbound = require('./inbound'),
	outbound = require('./outbound'),
	predicates = require('./predicates');

var MIDAS_HOST = '127.0.0.1', PORT = 4337, SEQ_TIME_LIMIT=400;    //should be lower than 500ms

var inname = 'my-in', outname='my-out';

//inbound and outbound connections
var inconn, outconn;

//the tables
var fntable = new predicates.FnTable();
var argstable = new predicates.ArgsTable();

var proceedfntable = new predicates.FnTable();
var proceedargstable = new predicates.ArgsTable();

//object holding replicated actions event names to avoid duplicates
var repltable = {}, replicateFn, REPLICATE_EVENT_TYPE = "ReplicateEvent", EVENT_TYPE = "REvent";

function start(cb){
	//connect inbound
	inbound.connect(MIDAS_HOST, PORT, inname,function(){
		//now that we have inbound, connect outbound
		outbound.connect(MIDAS_HOST, PORT, outname, function(){
			cb(true);

            onConnect();
		});		
	});		
}
//called after input connect is done
function onConnect(){			
	
	//inbound.addCode(" ( deftemplate Cursor (slot id) ( slot x) ( slot y) (slot state) (slot clientId) ) ");
	//inbound.addCode(' ( defrule echoCursor ?cursor <- (Cursor (x ?x) (y ?y) (state ?st) (clientId ?cid)) => (printout t  "Cursor found at: " ?x ", " ?y " " ?st "  " ?cid crlf) )');
    //for debugging purposes
    inbound.addCode( ''+
        '( defrule echoInvokes ' +
        '   (or (Invoked (dev ?d) (args ?a) (receiver ?id) (fn "mouseUp")) ' + //todo: mouseups => mouseup
        '       (Invoked (dev ?d) (args ?a) (receiver ?id) (fn "mouseDown"))  ' +
        '   ) ' +
        '   (Invoked (dev ?d) (args ?a) (receiver ?id) (fn ?f) (time ?t))  ' +
        '=> (printout t  "Invoked asserted: " ?f ". dev: " ?d ", args " ?a " rec " ?id ". at: " ?t crlf) ' +
        ')');

}
/**
*	publish: Publish event to midas
*	@param data:the object to publish. 
*				MUST contain a type field
*/
function publish(data){
	//consider data.shpid later
    //console.log("Publishing to midas fact: " + data.type);
	inbound.add(data);
	//{type: 'Cursor', x: data.x, y: data.y, state: data.state, clientId: data.clientId}
}
/*
*	Subscribe to events from midas
*/
function subscribe(eventType, callback){
	if (typeof callback !== 'function'){
		console.error("Error. Subscribe callback provided is not a valid function");
		return;
	}
	if (typeof eventType !== 'string'){
		console.error("Error. Event type to subscribe must be a string");		
		return;
	}
	
	outbound.addListener(eventType, callback);  //optimization: same callback added for different eventTypes?
	//subscribe
	inbound.addCode('(subscribe "'+eventType +'" "' +outname+'" )');
}
function unsubscribe(eventType){
	var listener = outbound.getListener(eventType);
	if (listener){
		//unsubscribe
		inbound.addCode('(unsubscribe "'+listener.eventType +'" "' +outname+'" )');
	}
}

/**
*	function addSExpression: Add some code to Midas
*	@param str: the code(string) to execute
*/
function addSExpression(str){
	inbound.addCode(str);
}
/** createCollabRule - send sequence initialization to midas
 @param data: DATA
 @param clientId: the client id
 @param invokecb: the normal callback
 */
function publishInvoke(data, clientId, invokecb){
	//add to table, get key. 
	//console.log("data: ");
	//console.dir(data);
	var argkey = argstable.add({fn: data.name, receiver: data.rec, args: data.args, device: clientId});
	var proceedargkey = argstable.add({fn: data.name, receiver: data.rec, args: data.args, device: clientId});

	
	//add the invoke callback in case of timeout
	fntable.put(argkey, invokecb);
	proceedfntable.put(argkey, invokecb);
	//send to midas
	publish({type: 'Invoked', fn: data.name, args: argkey, receiver: data.rec, dev: clientId, x: data.args.x, y: data.args.y});
	//now, use settimeout to call the fn if no response from midas
	setTimeout((function(key){ 
		var thekey = key;
		return function(){
			//console.log("\nTimeout happened. calling normal fn....");
			//find fn callback from table
			var cb = fntable.get(thekey);
			//if no cb, it was removed, so do nothing
			if (!cb){
				//console.log("..normal fn not found for key: "+thekey);				
				return;
			}
			//find and remove relatedargs from table
			var args = argstable.get(thekey);
			//call the cb
			//console.log("...called normal fn. ");
			cb(args);
		}
	})(argkey), SEQ_TIME_LIMIT);
}
/** createCollabRule - send sequence initialization to midas
 @param: seqname: the name of the sequence
 @param: rule:    the rule
 @param: seqcb:    the sequence callback
 */
function createCollabRule(seqname, rule, seqcb){
	//make the predicates first
	if ( !seqname || seqname.length === 0 )
		return;			
	
	//format the rule a bit. returns template and rule
	var ruleobj = formatRule(seqname, rule);
		
	var cb = function(data){
		//seqcb called: remove args from table
		console.log("M>> "+seqname+" called.. now lets get args from table and call cb");
		var theargs = data.args;
		var invokes = [];
		data.args.forEach(function(argkey){
			//remove args
            var argobj = argstable.get(argkey);
			invokes.push(argobj);

			//remove client callback
			var clientcb = fntable.get(argkey);			

			//call it but dismiss
			if (typeof clientcb === 'function')
				//call the previous awaiting fn, if it was still waiting (no need for args)
				clientcb.call(null, {isseqcb: true, msg: 'Function call ignored'});
		});
        console.log(seqname + " args: ");
        console.dir(invokes);
		//collab function called, activate its callback
		seqcb.call(null, invokes);

        console.log("..cb called on clients");
	};

    subscribe(seqname, cb);

	console.log("about to register template to midas.. \n");
	console.dir(ruleobj);
	
	//first send template
	addSExpression(ruleobj.template);
	//then send the rule
	addSExpression(ruleobj.rule);
}

/** replicateEvent - store the rule that will replicate the event
 * You can only call replicated actions on a replicated group object!!
 @param: data:
 @param eventname the eventname
 @param event the params
 * @param clientId
 * @param acknowledgementCb
 */
function replicateEvent(eventname, event, clientId, acknowledgementCb) {

    if (!eventname || eventname.length === 0) {
        console.error("midas.replicateEvent: Event name is not defined.");
        return;
    }

    var eventid = eventname + '-' + event.receiver;

    //this stops several clients registering same rule for replicating events
    if (repltable[eventid]) {
        var msg = "midas.replicateEvent: Event rule '" + eventname + "' already defined for receiver '" + event.receiver + "'";
        console.error(msg);
        acknowledgementCb(true, {msg: msg});
        return;
    }

    console.log("replicating event: " + eventname);

    var eventdata = {
        eventname: eventname,
        receiver: event.receiver,
        session: event.session || 'default',
        device: clientId
    };
    // var eventdata = {eventname: eventname, receiver: event.receiver, args: event.args, params: event.params,
    //     room: event.room || 'default', device: clientId};

    //store in table to avoid saving the event rule again
    repltable[eventid] = eventdata;

    //format the rule a bit. returns template and rule
    var rule = formatReplicateRule(eventid, eventname, eventdata);

    //then send the rule
    addSExpression(rule);

    acknowledgementCb(false, {msg: "Replicate rule created successfully"});
}


function setReplicateFn(fn){
    replicateFn = fn;

    var cb = function(data) {
        //console.log(" Replicated action called " + data.name);
        //now send to devices in room
        var args = argstable.get(data.args);
        if (args) {
            data.args = args;
        }

        //get grpid if different from receiver
        if (args){
            data.grpid = args.grpid;
            data.argsarray = args.argsarray;
        }

        if (typeof replicateFn === 'function') {
            replicateFn(data);
        } else {
            throw new Error("Replicate function callback is not set! ");
        }
    };

    //then subscribe to replicate events
    subscribe(REPLICATE_EVENT_TYPE, cb);
}


/** assertEvent - send event + info midas
 @param: data:
 @param eventname the eventname
 @param event contains the args, params and receiverid
 * @param clientId the device id
 */
function assertEvent(eventname, event, clientId, cb){
    //console.log("asserting event: " + eventname);

    var eventdata = {eventname: eventname, receiver: event.receiver, args: event.args, argsarray: event.argsarray,
        device: clientId, grpid: event.grpid, session: event.session};
    var argkey = argstable.add(eventdata);

    try {

    }catch(e){
        cb(e);
    }        //send to midas
    publish({type: EVENT_TYPE, name: eventdata.eventname , args: argkey, receiver: eventdata.receiver,
        device: eventdata.device, session: eventdata.session});

    if (typeof cb === 'function'){
        cb(null, true);
    }
}

/** 
 *	function formatRule: formats the rule from the device 
 *  @param seqname - name
 * @param rule - the rule to format
 *	@returns an obj with the template and the rule string
 */
function formatRule(seqname, rule){
	var wholerule = '';
	
	var deftemplate = '(deftemplate '+seqname+' (multislot args)) ';     //multislot requires 2 args or more to trigger a response.
	var defrule = '(defrule rule-'+seqname+' ';
	
	wholerule += defrule;
	//assert with seqname e.g. endrule, startrule, bodyrule
	rule = rule.replace('(call', '(printout t " calling callback '+seqname+'" crlf) (assert (' + seqname + ' ');
	rule = rule.replace(/function/g, 'fn');
	
	wholerule += rule += ' ) )';

    //escape double quotes
    //var r = new RegExp('"', "g");
    //wholerule = wholerule.replace(r, '\"');
	
	return {template: deftemplate, rule: wholerule};
}


function formatReplicateRule(eventid, eventname, evt){
    var rule = '(defrule replicate-action-'+eventid+' ';
    rule +=         '('+EVENT_TYPE+'  (name "'+ eventname + '")  (args ?a ) ' +
                    '(receiver "'+ evt.receiver +'") (session "'+ evt.session +'") (device ?dev) ' +
             ')';

    rule += '=>';
    rule += '(assert ('+REPLICATE_EVENT_TYPE+' (name "'+ eventname+'") (args ?a) (receiver "'+ evt.receiver+'") ' +
            '                        (device ?dev) (session "'+ evt.session+'") ))';


    rule += ' )';

    return rule;
}
//exports
exports.start = start;
exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.addSExpression = addSExpression;
exports.createCollabRule = createCollabRule;
exports.publishInvoke = publishInvoke;

exports.setReplicateFn = setReplicateFn;
exports.assertEvent = assertEvent;
exports.replicateEvent = replicateEvent;