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
	//subscribe("Invoked", cb);
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
	var argkey = argstable.add({fn: data.name, args: data.args, receiver: data.rec, clientid: clientId});
	//add the invoke callback in case of timeout
	fntable.put(argkey, invokecb);
	//send to midas
	publish({type: 'Invoked', fn: data.name, args: argkey, dev: clientId});	
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
/** publishSequenceConfig - send sequence initialization to midas
	@param: seqname: the name of the sequence
	@param: rule: 	the rule
	@param: seqcb:	the sequence callback 	
*/ 
function publishSequenceConfig(seqname, rule, seqcb){
	//make the predicates first
	var preds, i, l, inv, pred, seq;	
	if ( !seqname || seqname.length === 0 )
		return;			
	
	//format the rule a bit. returns template and rule
	var ruleobj = formatRule(seqname, rule);
	
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
				//TODO: Arguments
				clientcb.call(null, {isseqcb: true, msg: 'Function call ignored'});
		});
		//now send to node this info, so that it can distribute it
		seqcb.call(null, invokes);
	};
	
	//subscribe to this sequence once it is asserted
	subscribe(seqname, cb);

	//console.log("about to register template to midas.. \n");
	//console.dir(ruleobj);
	
	//first send template
	addSExpression(ruleobj.template);
	//then send the rule
	addSExpression(ruleobj.rule);
}
/** 
 *	function formatRule: formats the rule from the device 
 *  @param rule - the rule to format
 *	@returns an obj with the template and the rule string
 */
function formatRule(seqname, rule){
	var wholerule = '';
	
	var deftemplate = '(deftemplate '+seqname+' (multislot args)) ';
	var defrule = '(defrule rule-'+seqname+' ';
	
	wholerule += defrule;
	//assert with seqname e.g. endrule, startrule, bodyrule
	rule = rule.replace('(call', '(printout t "'+seqname+'" crlf) (assert (' + seqname + ' ');
	rule = rule.replace(/function/g, 'fn');
	
	wholerule += rule += ' ) )';
	
	return {template: deftemplate, rule: wholerule};
}
//exports
exports.start = start;
exports.publish = publish;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.addSExpression = addSExpression;
exports.publishSequenceConfig = publishSequenceConfig;
exports.publishInvoke = publishInvoke;//