
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
		@param allArgs - the 'arguments' array of the invoked function
	*/
	function proxyFunction(fn, invoked, allArgs){	
		var interception = {
			'fn': invoked.fn,
			args: invoked.args,
			argmap: '',//allArgs,
			rec: invoked.receiver || 'none'
		};
		debugger;
		fn();
		/*leadersocket.emit('fn_invoked', interception, function (data) {			
			
			if (!data.isseqcb){				
				//To call the normal (invoked) function call: fn.
				fn();
			}					
		});
		*/
	}
	/**
		send the rule to server to create necessary templates/rule(s)
		@param name: the name of the rule
		@param rule: the rule string
	*/
	function sendRuleToServer(rule){
		
		//send event to leader/server. can add client id here
		leadersocket.emit('register_sequence', rule.rulename, rule.rule, function (msg) {		
			//output the results of the registration
			//note this is not the sequence callback
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
			//replace fn with proxy fn
			var params = getFunctionParams(func);
			
			o[inv] = ( function (val, fun, theparams) {	//enclose in closure
				return function() {
				//receiver is "this" when fn is called. args is in arguments array
				var self = this, args = Array.prototype.slice.call(arguments);
				//call proxy
			
				return proxyFunction.call(this, function() {
					//remember scope could be lost, so use self var as scope
					//debugger;
					return fun.apply(self, args);
					}, val, args, theparams);
				}
			})(inv,func, params);
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
	
	/** proxy. inspired by Darren Schnare's aopjs, MIT
		@param obj - object to be proxied
	*/
	return {
		register: function (obj){
			var properties, fnproperties;
			
			applyInterceptions(obj);
		},
		'registerWhenever': sendRuleToServer
	};
	
});