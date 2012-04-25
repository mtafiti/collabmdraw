(deftemplate Invoke (slot name) (slot receiver) (slot args) (slot clientid))
(set-default-timespan "Invoke" 10000)

(deftemplate enable-rule (slot x))

(defrule invokeAdded 
	(enable-rule (x ?x))
	?fn1 <- (Invoke (name ?n1) (receiver ?r1) (args ?args1) (on ?on1) (clientid ?clientid1))		
	=>	
	(printout t "called js function: " ?n1 ". receiver: " ?r1 ". args:" ?args1 " client:" ?clientid1 " ."  crlf))