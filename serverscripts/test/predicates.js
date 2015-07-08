var utilities = require('./utilities');
	
	var SEQ_TIME_LIMIT = 500;
	var seqCount = 0;
	var predCount = 0;
	/**
	function argsTable 
	@param: argsTable = hashmap for args
	*/
	var ArgsTable = function (){
		var __id = 1;

		this.add = function(obj){
			var theid = getid();
			this[theid] = obj;
			return theid;
		};
		this.get = function(id){
			var temp = this[id];
			delete this[id];	//remove the entry
			return temp;
		};
		function getid(){
			return __id++;
		}
	};

	//the table holding the invoke arguments
	var FnTable = function(){
		this.get = function(key){				
			var tempkey = this[key];
			delete this[key];			
			return tempkey;
		};
		//put and return the key
		this.put = function(key, val){
			if (!key)	
				key	= utilities.uuidFast();	//get new key
			this[key] = val;
			return key;
		};
	};
	
	
	/**
	Predicate - constructor function for a rule within a sequence
	@param name: the name of the predicate
	@param fnname: the name of the invoked function
	@param args: an array of the arguments of the function
	@param receiver: the receiver of the function invocation
	@param cid: the client id of the function invocation
	*/
	var Predicate = function (name, fnname, args, receiver, cid){
		this.name = name;				//the name
		this.fnName = fnname;			//the fn name
		this.receiver = receiver;		//the reciever
		this.args = args				//the args id
		this.clientid = cid;	//the clientid
		
		/** 
			write function
		*/
		this.write = function(){
			var str = ''; 
			str += ' ?'+ this.name ;
			str += ' <- (Invoke ';
			str += ' (name "'+this.fnName+'" ) ';		//only constant
			str += ' (args ?args_'+this.fnName+' ) '; 
			str += ' (on ?on'+'_'+this.fnName+ ' ) ';
			str += ' (receiver  ?receiver_'+this.fnName+' ) ';	//rest are variables to be bound
			str += ' (clientid  ?cid_'+this.fnName+' ) ';	
			str += ' ) ';
			
			
			str += (this.args === '' || this.args === null || this.args.length === 0) ?
				''	//can also test if ()
				:'(test (eq "'+this.args+'" ?args_'+this.fnName+' ) )';
				
			str += (this.receiver  === '' || this.receiver === null) ?	
				''	//can also test if nil
				:'(test (eq "'+this.receiver+'" ?receiver_'+this.fnName+' )) ';
			
			str += this.clientid ? '(test (eq "'+this.clientid +'" ?cid_'+this.fnName+' )) ': '';
			
			return str;
		};					
	};
	/**
	Sequence - constructor function for a sequence
	@param name: the name of the sequence
	@param predicates: the predicate objects contained in the sequence
	@param callback: the callback fn
	*/

	var Sequence = function (name, predicates, callback){
		
		this.name = name ? 'Sequence_'+name : 'Sequence_'+ (seqCount++);	//will be used to subscribe for the callback, in the server
		this.predicates = predicates;
		this.callback = callback;	
		
		// create the template for this sequence
		var templatestr = '';
		templatestr += '( deftemplate '+this.name+' (multislot args) (slot name) ) ';
		
		//create the rule string
		var rulestr ='';
		rulestr +='(defrule Invoke_'+this.name+' ';
		
		//create the rule string
		var timespanstr ='';
		timespanstr +='(timespan '+SEQ_TIME_LIMIT+' )';
		
		this.write = function(){
			
			if (this.predicates.length === 0)
				return '()';
			
			var lhsstr = '', 
				rhsstr = '', 
				cidsstr ='(test (neq ';
			var prednames = '';
		
			//string to test within some time limit
			var onstr = '(test (time:within$ (create$ ';			
			
			rhsstr += '(assert ('+this.name+ ' (args (create$ ';	//start building rhs arglist
			
			//first, define all templates of the predicates
			for (var i = 0, l = this.predicates.length; i < l; i++){
				var pred = this.predicates[i];
				//templatestr += ' (deftemplate '+pred.fnName+' ';
				//templatestr += ' (slot name) (slot args) (slot receiver) (slot on)';					
				//templatestr += ' )';
				
				//build the pred rule
				lhsstr += pred.write();
				//test within timeframe
				onstr += ' ?on_'+pred.fnName; 								
				
				prednames += pred.fnName+ '_';
				
				rhsstr += '?args_'+pred.fnName+' ';	//args				
				
				cidsstr += ' ?cid_'+pred.fnName;	//client ids
			}
			
			rhsstr += ' ) ) ';	//close args
			
			rhsstr += ' (name "'+prednames+'" )';	//the name
			
			//set timespan for sequence 
			rhsstr += timespanstr;
			
			rhsstr += ' ) ';	//close the seq
						
			rhsstr += ' ) ';	//close the assert
			
			onstr += ' ) ';	//close onstr						
						
			//build time limit str
			onstr += SEQ_TIME_LIMIT+' ) ) ';	//close the create and test
						
			cidsstr += ' ) ) ';	//close neq
			
			//add to lhs
			lhsstr += onstr;// + cidsstr;	//time limit and different clients predicates
			
			//build rule string
			rulestr += lhsstr + " => " + rhsstr;
			rulestr += ' ) ';	//close defrule
			
			//return template and rule			
			return {template: templatestr, rule: rulestr};
		};		
		
	};	
exports.ArgsTable = ArgsTable;
exports.FnTable = FnTable;
exports.Predicate = Predicate;
exports.Sequence = Sequence;