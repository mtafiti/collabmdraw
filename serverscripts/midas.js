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
	
	inbound.addCode(" ( deftemplate Cursor (slot id) ( slot x) ( slot y) (slot state) (slot clientId) ) ");
	inbound.addCode(' ( defrule echoCursor ?cursor <- (Cursor (x ?x) (y ?y) (state ?st) (clientId ?cid)) => (printout t  "Cursor found at: " ?x ", " ?y " " ?st "  " ?cid crlf) )');	
	
	//subscribe 
	//cursor callback
	var cb =  function(data){
		//console.log("M>> Info from Midas: ");
		//console.dir(data);
	};
	//subscribe("Cursor",cb);
	
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
/** publishSequenceConfig - send sequence initialization to midas
	@param: data: 		
	@param clientId: the client id 
	@param invokecb: the normal callback 
*/ 
function publishInvoke(data, clientId, invokecb){
	//add to table, get key. 
	//console.log("data: ");
	//console.dir(data);
	var argkey = argstable.add({fn: data.fn, args: data.args, receiver: data.rec, clientid: clientId, argmap: data.argmap});
	//add the invoke callback in case of timeout
	fntable.put(argkey, invokecb);
	//send to midas
	publish({type: 'Invoke', name: data.fn, args: argkey, receiver:  data.rec, clientid: clientId});		
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
/** publishSequenceConfig - send sequence initialization to midas
	@param: obj: 	
*/ 
function publishSequenceConfig(seqname, rule, seqcb){
	//make the predicates first
	var preds, i, l, inv, pred, seq;	
	if ( !seqname || seqname.length === 0 )
		return;			
	
	//format the rule a bit
	var rulestr = formatRule(seqname, rule);
	
	//TODO: work out the callback
	var cb = function(data){
		//remove args from table
		
		var theargs = data.args;
		var invokes = [];
		data.args.forEach(function(argkey){
			//remove args
			invokes.push(argstable.get(argkey));
			//remove client callback
			var clientcb = fntable.get(argkey);			
			//call it but dismiss
			if (typeof clientcb === 'function')
				clientcb.call(null, {isseqcb: true, msg: 'Function call ignored'});
		});
		//now send to node this info, so that it can distribute it
		seqcb.call(null, invokes);
	};
	
	//subscribe to this sequence once it is asserted
	subscribe(seqname, cb);

	console.log("about to register sequence to midas.. \n");
	console.log(rulestr);
	
	//then send string to midas
	addSExpression(rulestr);
}
/** 
 *	function formatRule: formats the rule from the device 
 *  @param rule - the rule to format
 *	@returns the formatted rule
 */
function formatRule(seqname, rule){
	var wholerule = '';
	
	var deftemplate = '(deftemplate '+seqname+' (multislot args)) ';
	var defrule = '(defrule rule-'+seqname+' ';
	
	wholerule += deftemplate;
	wholerule += defrule;
	
	rule = rule.replace('(call', '(assert (' + seqname + ' ');
	rule = rule.replace('function', 'fn');
	
	wholerule += rule;
	// += ' )';
	
	return wholerule;
}
//exports
exports.start = start;
exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.addSExpression = addSExpression;
exports.publishSequenceConfig = publishSequenceConfig;
exports.publishInvoke = publishInvoke;