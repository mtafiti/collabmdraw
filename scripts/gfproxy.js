
/**
		proxy that takes over a grp object.
		@param leadersocket - the socket that proxy will use to send invoke info to leader
	*/
var gfProxyInit = (function(leadersocket) {
	//the sequence waiting time in milliseconds
	var SEQ_TIME_LIMIT = 400;
	
	//info message has been sent from server. right now just log it.
	leadersocket.on('msg', function (msg) {	
			//callback from proxy channel
			console.info("Published from leader channel:");
			console.dir(msg);
	});	
	
	/**
		proxy function that sends to server that an interception has happened
		@param fn - the function being intercepted
		@param invoked - the invoked array for the sequence
		@param args - the 'arguments' array of the invoked function. includes receiver.
		@param rec - the receiving shape
		@param params - the extracted params of invoked function (extracted, due to js limits)
	*/
	function proxyFunction(fn, fnname, args , rec, params){	
	
		//first format args with their params
		var fnargs = {};
		
		for (var i = 0, l = args.length; i < l; i++){
			//first check if param is defined
			if (!params[i]){
				//if not, create new param name for this arg
				params[i] = 'arg_'+ i;
			}
			//limitation: need to remove cormat event object in the event args for serialization
			if  (isEvent(args[i])){
				var e = args[i];				
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
				fnargs[params[i]] = basicEventOpts;
			} else {
				//todo: may need to strip whitespace
				fnargs[params[i]] = args[i];
			}
		}			

		var interception = {
			//'fn': fn,			//the intercepted function
			name: fnname,		//its name			
			'rec': rec,			//the receiver
			args: fnargs		//its arguments
		};
		
		leadersocket.emit('fn_invoked', interception, function (data) {						
			if (!data.isseqcb){				
				//To call the normal (invoked) function call: fn.
				fn();
			}					
		});
		
	}
	/**
		send the rule to server to create necessary templates/rule(s)
		@param name: the name of the rule
		@param rule: the rule string
	*/
	function sendRuleToServer(rule){
		
		//send event to leader/server. can add client id here
		leadersocket.emit('register_sequence', rule.rulename, rule.rule, function (msg) {		
			//output the results of the registration of the rule
			//note: this is not the sequence callback
			console.log(msg); 
		});
		
		var seqcb = rule.rulefn;
		//when a sequence has been detected...
		leadersocket.on('sequence_callback',function(data){			
			//todo: context
			seqcb.call(null, data);
		});
	}
	
	/**
		apply the interceptions
		@param o: the shape object
		@param invokeArr: the array of invoke json objects
	*/
	function applyInterceptions(o){		
		var func, err, i, l, rules = [], seqcb, invokeArr =[];		
		
		var properties = [];
		if (o) {
			for (key in o) {
				properties.push(key);
			}
		};			
		
		//filter fns only. note: filter has to exist
		var fnproperties = properties.filter(function(prop){ 
			//for this scenario, check if its a function and starts with mouse
			return typeof o[prop] === "function" && (prop.lastIndexOf("mouse", 0) === 0); 
		});
		
		for ( i = 0, l = fnproperties.length; i < l; i++ ){		
			
			inv = fnproperties[i];
			func = o[inv];
			
			//check if it is a function
			if (typeof func !== "function") continue;
			//function params
			var params = getFunctionParams(func);
			//replace fn with proxy fn
			o[inv] = ( function (val, fun, rec, theparams) {	//closure
				return function() {
				//receiver is "this" when fn is called. args is in arguments array
				var self = this, args = Array.prototype.slice.call(arguments);
				
				//call proxy			
				return proxyFunction.call(this, function() {
					//remember scope could be lost, so use self var as scope
					//debugger;
					return fun.apply(self, args);
					}, val, args, rec, theparams);
				}
			})(inv,func,o.shpid, params);
		}
	}
	
	
	/** 
	*	utility functions
	*/
	(function() {		
		// ensure object.hasOwnProperty works as it should,
		// to avoid browser discrepancies
		try {
			var F = function() { this.age = 20; };
			F.prototype.name = "o";
			var names = Object.getOwnPropertyNames(new F());
			if (names.length !== 1 || names[0] !== "age") throw "fail";
		} catch (error) {
			Object.getOwnPropertyNames = function(o) {
				var key, names = [];

				if (o) {
					for (key in o) {
						if (o.hasOwnProperty(key)) names.push(key);
					}
				}

				return names;
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
	})();
	
	/**
	 * decycle and cycle functions
	 * deal with circular references when (de)serializing
	 * adapted from: http://glittle.org/blog/cyclic-json/
	 */
	function decycle(obj){
		
		seen = [];

		var newobj = JSON.stringify(obj, function(key, val) {
		   if (typeof val === "object") {
				if (seen.indexOf(val) >= 0)
					return undefined;
				seen.push(val);
			}
			return val;
		})
		
		return newobj;
	}
	
	/**
	 * function isEvent: serializing mouse event object in javascript is a pain,
	 * so use this function to check an intercepted argument is an event. if so, strip it down 
	 * see: http://stackoverflow.com/questions/1458894/how-to-determine-if-javascript-object-is-an-event
	 * to its essentials before sending to the leader
	 */
	function isEvent(a){
		var txt, es=false;
		txt = Object.prototype.toString.call(a).split('').reverse().join('');
		es = (txt.indexOf("]tnevE") == 0)? true: false; // Firefox, Opera, Safari, Chrome
		if(!es){
			txt = a.constructor.toString().split('').reverse().join('');
			es = (txt.indexOf("]tnevE") == 0)? true: false; // MSIE
		}
		return es;
	}


	//-----------------------
	
	/** proxy. inspired by Darren Schnare's aopjs, MIT
		@param obj - object to be proxied
	*/
	return {
		register: function (obj){						
			applyInterceptions(obj);
		},
		'registerWhenever': sendRuleToServer
	};
	
});