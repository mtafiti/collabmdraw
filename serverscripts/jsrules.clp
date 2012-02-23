

(deftemplate Invoke (slot name) (slot receiver) (multislot args))
	
(defrule invokeAdded 
	?fn1 <- (Invoke (name ?n1) (receiver ?r1) (args $?args1) (on ?on1))	
	=>	
	(printout t "called js function: " ?n1 ". receiver: " ?r1 ". args:" ?args1 " ."  crlf))

