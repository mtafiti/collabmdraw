
var inbound = require('./inbound'),
	outbound = require('./outbound');

var HOST = '127.0.0.1', PORT = 4337;

var inname = 'my-in', outname='my-out';

//inbound and outbound connections
var inconn, outconn;
//rule count index - no of rules auto-added
var ruleCount = 0;

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
	
	inbound.addCode(" ( deftemplate Cursor (slot id) ( slot x) ( slot y) (slot state) (slot clientId) ) ");
	inbound.addCode(' ( defrule echoCursor ?cursor <- (Cursor (x ?x) (y ?y) (state ?st) (clientId ?cid)) => (printout t  "Cursor found at: " ?x ", " ?y " " ?st "  " ?cid crlf) )');	
	
	//subscribe 
	//cursor callback
	var cb =  function(data){
		console.log("M>> Info from Midas: ");
		console.dir(data);
	};
	subscribe("Cursor",cb);
	
	//load the file with fn templates and other initialization
	inbound.loadFile("jsrules.clp");
	
	//after loading, subscribe to any fn call asserts - use cb for now
	subscribe("Invoke", cb);
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
//exports
exports.start = start;
exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.addSExpression = addSExpression;