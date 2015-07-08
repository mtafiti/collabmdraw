var inbound = require('./inbound'),
	outbound = require('./outbound'),
	predicates = require('./predicates');

var HOST = '127.0.0.1', PORT = 4337, SEQ_TIME_LIMIT=500;

var inname = 'my-in', outname='my-out';

//inbound and outbound connections
var inconn, outconn;

//the args table
var fntable = new predicates.FnTable();
var argstable = new predicates.ArgsTable();

function start(){
	//connect inbound
	inbound.connect(HOST, PORT, inname,function(){
		//now that we have inbound, connect outbound
		outbound.connect(HOST, PORT, outname, function(){
			onConnect();
		});		
	});		
}
//called after input connect is done
function onConnect(){			
	
	//inbound.addCode(" ( deftemplate Cursor (slot id) ( slot x) ( slot y) (slot state) (slot clientId) ) ");
	//inbound.addCode(' ( defrule echoCursor ?cursor <- (Cursor (x ?x) (y ?y) (state ?st) (clientId ?cid)) => (printout t  "Cursor found at: " ?x ", " ?y " " ?st "  " ?cid crlf) )');	
	
	//subscribe callback
	var cb =  function(data){
		//console.log("M>> Touch Event from Midas: state:" + data.state+" device: "+data.dev);
		//console.dir(data);
	};
	//subscribe("Cursor",cb);
	
	//load the file with test rules
	inbound.loadFile();
	
	//after loading, subscribe to any fn call asserts - use cb for now
	subscribe("Touch", cb);
}
/**
*	publish: Publish event to midas
*	@param data:the object to publish. 
*				MUST contain a type field
*/
function publish(data){
	//consider data.shpid later	
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
	//TODO: later check if type is already there	
	outbound.addListener(eventType, callback);
	//subscribe
	inbound.addCode('(subscribe "'+eventType +'" "' +outname+'" )');
	
}
function unsubscribe(eventType){
	var listener = outbound.getListener(eventType);
	if (listener){
		//unsubscribe
		inbound.addCode('(unsubscribe "'+listener.eventType +'" "' +listener.callback+'" )');
	}
}

/**
*	function addSEXpression: Add some code to Midas
*	@param str: the code(string) to execute
*/
function addSExpression(str){
	inbound.addCode(str);
}
/** publishTouchEvent - send touch data to midas
	@param: data: 		
	@param clientId: the client id 
	@param invokecb: the normal callback 
*/ 
function publishTouchEvent(data, clientId, invokecb){
	//add to table, get key. 
	//console.log("data: ");
	//console.dir(data);
	var argkey = argstable.add({fn: data.fn, args: data.args, receiver: data.rec, clientid: clientId, argmap: data.argmap});
	//add the invoke callback in case of timeout
	fntable.put(argkey, invokecb);
	
	var st = 0;	//the state
	switch (data.fn){
		case 'md':
			st = 0;
		break;
		case 'mm':
			st = 1;
		break;
		case 'mu':
			st = 2;
		break;
	}
	//send to midas
	publish({type: 'Touch', x:0, y:0, state: st, dev: clientId, args: argkey});		
	//publish({type: 'Touch', name: data.fn, args: argkey, receiver:  data.rec, clientid: clientId});
	
	//now, use settimeout to call the fn if no response from midas
	setTimeout((function(key){ 
		var thekey = key;
		return function(){
			//console.log("\nTimeout happened. calling normal fn....");
			//remove args from table
			var cb = fntable.get(thekey);
			//if no cb, it was removed, so do nothing
			if (!cb){
				//console.log("..normal fn not found for key: "+thekey);				
				return;
			}
			//remove the other args
			var args = argstable.get(thekey);
			//call the cb
			//console.log("...called normal fn. ");
			cb(args);
		}
	})(argkey), SEQ_TIME_LIMIT);
}
/** createCollabRule - send sequence initialization to midas
 @param: obj:
 */
function publishSequenceConfig(invokeArr, seqname, seqcb){
	//make the predicates first
	var preds, i, l, inv, pred, seq;	
	
	preds = [];	
		
	//the callback
	var cb = function(data){
		//remove args from table		
		var invokes = [];
		data.args.forEach(function(argkey){
			//remove args
			invokes.push(argstable.get(argkey));
			//remove client callback
			var clientcb = fntable.get(argkey);			
			//call it but dismiss
			if (typeof clientcb === 'function'){ 		
				clientcb.call(null, {isseqcb: true, msg: 'Local function call ignored'});
			}
		});
		//now send to node this info, so that it can distribute it					
		//eventType - touchdown, touchup etc
		seqcb.call(null, invokes, data.type);
	};	
	
	//subscribe to sequence once it is asserted
	subscribe('bodyDM', cb);			
	subscribe('endDM', cb);			
	subscribe('startDM', cb);
}	

//exports
exports.start = start;
exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.addSExpression = addSExpression;
exports.createCollabRule = publishSequenceConfig;
exports.publishTouchEvent = publishTouchEvent;