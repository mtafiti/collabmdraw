
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
			console.info("Published from proxy channel:");
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
		//if we want to send x and y to midas, have a look at normalizeMouseXY in fdraw
		leadersocket.emit('fn_invoked', interception, function (data) {			
			
			if (!data.isseqcb){				
				//To call the normal (invoked) function call: fn.
				fn();
			}					
		});
	}
	/**
		send the seq config to server to create necessary templates/rule(s)
		@param invokeArr: the array of sequence invoke configs
		@param seqcb: the the sequence callback object
	*/
	function sendConfigToServer(invokes, seqcb){
		
		//send event to leader/server.
		leadersocket.emit('register_sequence', invokes, 'Sequence', function (msg) {		
			//output the results
			console.log(msg); 
		});
		
		//distributed callback
		leadersocket.on('distr_callback',function(data, eventType){			
			//TODO: scope
			seqcb.fn.call(null, data, eventType);
		});
	}
	
	/**
		apply the interceptions
		@param o: the object
		@param invokeArr: the array of invoke json objects
	*/
	function applyInterceptions(o, invokeArr){		
		var func, err, i, l, inv, seqcb;		
		
		//the callback for the sequence
		seqcb = o.seq.callback;
		
		for ( i = 0, l = invokeArr.length; i < l; i++ ){			
			
			inv = invokeArr[i];
			func = o[inv.fn];
			
			//check if it is a function
			if (typeof func !== "function") continue;
			//replace fn with proxy fn
			
			o[inv.fn] = ( function (val, fun) {	//enclose in closure
				return function() {
				//receiver is "this" when fn is called. args is in arguments array
				var self = this, args = Array.prototype.slice.call(arguments);
				//call proxy
			
				return proxyFunction.call(this, function() {
					//remember scope could be lost, so use self var as scope
					//debugger;
					return fun.apply(self, args);
					}, val, args);
				}
			})(inv,func);
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
	})();
	
	/** proxy. inspired by Darren Schnare's aopjs, MIT
		@param obj - object to be proxied
	*/
	return {
		intercept: function (obj){
			var properties, propertiesStr, invokeArr, i, l;
			
			if ( !obj.seq || !obj.seq.invoked )
				return obj;
				
			//get propertynames as an array
			//properties = Object.getOwnPropertyNames(o);			
			//filter fns only - filter has to exist
			//properties = properties.filter(function(prop){ return typeof prop === "function"; });
			
			//see if only one predicate is defined
			invokeArr = (obj.seq.invoked instanceof Array) === true ? obj.seq.invoked : [obj.seq.invoked];			
			applyInterceptions(obj, invokeArr);
			
		},
		'sendConfigToServer': sendConfigToServer
	};
	
});