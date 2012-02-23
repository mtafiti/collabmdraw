
/** proxy. original concept inspired by Darren Schnare, MIT
	@param client - the socket binding to the server
*/
var gfProxyInit = (function(leadersocket,lTable, fTable) {

	var SEQ_TIME_LIMIT = 500;
	
	leadersocket.on('msg', function (msg) {	
			//callback from proxy channel
			console.info("Published from proxy channel:");
			console.dir(msg);
	});	
	
	/**
		proxy function that sends to server an interception has happened
		@param fn - the function being intercepted
		@param invoked - the invoked array for the sequence
		@param seqcb: the callback of the sequence, incase this function activates it
	*/
	function proxyFunction(fn, invoked, seqcb){
		var interception = {
			'fn': invoked.fn,
			args: invoked.args,
			rec: invoked.reciever,
			cid: leadersocket.id
		};
	
		//send event to leader/server. can add client id here
		leadersocket.emit('fn_invoked', interception, function (data) {
			//TODO:check if server returns normally or a sequence has been realised
			
			//First convert arguments into local objects
			fn();
			//Then, to call the normail(invoked) function call fn.
			//To invoke the sequence callback, cal seqcb
			console.log(data); 
		});
	}
	/**
		send the seq config to server to create necessary templates/rule(s)
		@param obj: the object
		@param invokeArr: the array of configs
	*/
	function sendConfigToServer(seq){
		var obj = [], i, l, inv;		
		
		//write
		var str = seq.write();
		var seqname = seq.name;
		
		//send event to leader/server. can add client id here
		leadersocket.emit('register_sequence', str, seqname, function (msg) {
			
			console.log(msg); 
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
					}, val, seqcb);
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
	
	/** 
	*	ajax remote POST call
	*	@param url: the url
	*	@param args: the args to send
	*	@param responseCallback	the callback fn
	*/
	function remoteCall(url, args, responseCallback) {
		http = new XMLHttpRequest();
		http.open("POST", url, true);
		
		http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		http.setRequestHeader("Content-length", args.length);
		http.setRequestHeader("Connection", "close");

		
		http.onreadystatechange = function() {
			if (http.readyState === 4) {
				 if (http.status === 200) {  
					var response = JSON.parse(http.responseText);
					responseCallback(response);  
				} else {  
				  console.log("Error", http.statusText);  
				} 
				
			};
		};
		http.send(args);
	};
	
	//-------------- predicates -----------------------
	/**
	Predicate - constructor function for a rule within a sequence
	@param name: the name of the predicate
	@param fnname: the name of the invoked function
	@param args: an array of the arguments of the function
	@param receiver: the receiver of the function invocation
	*/
	var Predicate = function (name, fnname, args, receiver){
		this.name = name;				//the name
		this.fnName = fnname;			//the fn name
		this.receiver = receiver;		//the reciever
		this.args = args				//the args of the fn
		//this.client = client || '';	//the clientid
		
		/** 
			write function
		*/
		this.write = function(){
			var str = ''; 
			str += " ?"+ this.name ;
			str += " <- (Invoke ";
			str += " (name "+this.fnName+" ) ";		//only constant			
			str += " (args $?args_"+this.fnName+" ) "; 
			str += " (on ?on"+"_"+this.fnName+ " ) ";
			str += " (receiver  ?receiver_"+this.fnName+" ) ";	//rest are variables to be bound
			str += " ) ";
			
			var refs="";
			//check if we have references to local objects, 
			//then convert to far refs

			if (this.args instanceof Array){	//TODO: confirm this
				//convert to far refs
				for (var i = 0, l = this.args.length; i < l; i++){
					var temp = this.args[i];
					
					if ((typeof temp === 'object') && (typeof temp.write === 'function'))
						temp = temp.write();
					refs = refs + temp +" ";
				}
			}else {
				refs = this.args;
			}
			str += this.args ? 
				'(test (eq (create$ '+refs+') ?args_'+this.fnName+' ) )'
				: '';
			str += this.receiver ? 
				'(test (eq '+this.receiver+' ?receiver_'+this.fnName+' )) '
				: '';
			
			return str;
		}						
	};
	/**
	Sequence - constructor function for a sequence
	@param name: the name of the predicate
	@param fnname: the name of the invoked function
	@param args: an array of the arguments of the function
	@param receiver: the receiver of the function invocation
	*/
	var Sequence = function (name, predicates, callback){
		this.name = 'Sequence_'+name;	//will be used to subscribe for the callback, in the server
		this.predicates = predicates;
		this.callback = callback;
		
		// create the template for this sequence
		var templatestr = '';
		templatestr += '( deftemplate '+this.name+' (multislot args) ) ';
		
		//create the rule string
		var rulestr ='';
		rulestr +='(defrule Invoke_'+this.name+' ';
		
		this.write = function(){
			var lhsstr = '', rhsstr = '';
			
			//string to test within some time limit
			var onstr = '(test (< (- ';
			var onmaxstr = '(max ';
			var onminstr = '(min ';
			
			rhsstr += '(assert ('+this.name+ ' (args ';	//or can do a concat of fn names
			//first, define all templates of the predicates
			for (var i = 0, l = this.predicates.length; i < l; i++){
				var pred = this.predicates[i];
				//templatestr += ' (deftemplate '+pred.fnName+' ';
				//templatestr += ' (slot name) (slot args) (slot receiver) (slot on)';					
				//templatestr += ' )';
				
				//build the pred rule
				lhsstr += pred.write();
				//test within timeframe
				onmaxstr += " ?on_"+pred.fnName; 
				onminstr += " ?on_"+pred.fnName; 
				//build the rhs for this pred
				rhsstr += ' (create$ '+pred.fnName;
				rhsstr += ' (create$ '+pred.args.join(" ")+')';	//args
				rhsstr += pred.receiver+' )';	//reciever
			}
			
			rhsstr += ' ) ) )';
			
			onmaxstr += ' )';
			onminstr += ' )';
			
			//build time limit str
			onstr += onmaxstr + onminstr + " ) "+SEQ_TIME_LIMIT+" ) ) ";
			//add to lhs
			lhsstr += onstr;
			
			//build rule string
			rulestr += lhsstr + " => " + rhsstr;
			rulestr += ' ) ';
			
			//now build the entire string
			var str = templatestr + rulestr;
			
			return str;
		};		
		
	};
	
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
		'sendConfigToServer': sendConfigToServer,
		'Predicate': Predicate,
		'Sequence': Sequence
	};
	
});