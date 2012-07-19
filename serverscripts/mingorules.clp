(deftemplate startRule (multislot args))
(defrule rule-startRule
	(Invoked (fn "moveDown") (dev ?d1) (on ?on1) (args ?a1))
	(Invoked (fn "moveDown") (dev ?d2) (on ?on2) (args ?a2))
	(test (neq ?d1 ?d2))
	(test (time:within ?on1 ?on2 500))
	(not (startDM (dev1 ?d1) (on ?on1)))
	(not (and (Invoked (fn "mouseUp") (dev ?d1) (on ?on3))
				(test (time:before ?on2 ?on3))))
	=>
	(printout t "startDM1 asserted" crlf)
	(assert (startDM (dev ?d1) (dev ?d2) (on ?on1) (args ?a1 ?a2)))
	(assert (startRule (args ?a1 ?a2)))
)

;start has two rules
(defrule rule-startRule2
	(Invoked (fn "moveDown") (dev ?d1) (on ?on1) (args ?a1))
	(Invoked (fn "mouseMove") (dev ?d2) (on ?on2) (args ?a2))
	(test 	(neq ?d1 ?d2))
	(test (time:within ?on1 ?on2 500))
	(not (startDM (dev1 ?d1) (on ?on1)))
	(not (and 	(Invoked (fn "mouseUp") (dev ?d1) (on ?on3))
			(test (time:before ?on2 ?on3))))
	=>
	(printout t "startDM2 asserted" crlf)
	(assert (startDM (dev1 ?d1) (dev2 ?d2) (on ?on1) (args ?a1 ?a2)))
	(assert (startRule (args ?a1 ?a2)))
)
	
(deftemplate bodyRule (multislot args)) 
(defrule rule-bodyRule 
	(startDM (dev1 ?d1) (dev2 ?d2)) 
	(not (or (endDM (dev1 ?d1) (dev2 ?d2)) (endDM (dev1 ?d2) (dev2 ?d1)))) 
	;(Invoked (fn mouseMove) (args ?x ?y ?on) (dev ?dm)) 
	(Invoked (fn mouseMove) (args ?a1) (dev ?dm)) 
	(test (or (= ?dm ?d1)(= ?dm ?d2))) 
	=> 
	(printout t "bodyDM asserted" crlf)
	(assert (bodyDM (dev1 ?d1) (dev2 ?d2)))
	(assert (bodyRule  (args ?a1)))
)

(deftemplate endRule (multislot args)) 
(defrule rule-endRule 
	(startDM (dev ?d1) (dev ?d2) (on ?don) )
	(Invoked (fn "mouseMove") (dev ?dx) (on ?on1) (args ?a1))
	(test (or (eq ?dx ?d1) (eq ?dx ?d2)))
	(not (endDM (dev1 ?d1) (dev2 ?d2) (on ?don)))
	=>
	(printout "endDM asserted" crlf)
	(assert (endDM (dev1 ?d1) (dev2 ?d2) (on ?don) (args ?a1)))
	(assert (endRule (args ?a1)))
)

;---------------------------------------
startRule: rule("startRule",
                        '(Invoked (function "moveDown") (dev ?d1) (args ?x1 ?y1) (on ?on1))'
                        '(Invoked (function "moveDown") (dev ?d2) (args ?x2 ?y2)(on ?on2))'
                        '(test (neq ?d1 ?d2))'
                        '(test (time:within ?on1 ?on2 500))'
                        '(not (startDM (dev1 ?d1) (on ?on1)))'
                        '(not (and     (Invoked (function "mouseUp") (dev ?d1) (args ?x3 ?y3) (on ?on3))'
                        '            (test (time:before ?on2 ?on3))))'
                        '=>'
                        '(printout t "startDM1 asserted" crlf)'
                        '(assert (startDM (dev1 ?d1) (dev2 ?d2) (on ?on1) (args ?x1 ?y1)))'
                        '(call (args ?x1 ?y1  ?x2 ?y2))'),
        bodyRule: rule("bodyRule",
                        '(startDM (dev1 ?d1) (dev2 ?d2))' 
						'(not (or (endDM (dev1 ?d1) (dev2 ?d2)) (endDM (dev1 ?d2) (dev2 ?d1))))'
						'(Invoked (function "mouseMove") (args ?x ?y) (on ?on) (dev ?dm))'
						'(test (or (= ?dm ?d1) (= ?dm ?d2)))'
						'=>'
						'(assert (bodyDM (dev1 ?d1) (dev2 ?d2) (args ?x ?y)))'
						'(call (args ?x ?y))'),
        endRule: rule("endRule",
                        '(startDM (dev1 ?d1) (dev2 ?d2) (on ?don) ) (Invoked (function "mouseMove") (dev ?dx) (args ?x ?y) (on ?on1)) (test (or (eq ?dx ?d1) (eq ?dx ?d2))) (not (endDM (dev1 ?d1) (dev2 ?d2) (on ?don))) => (printout "endDM asserted" crlf) (assert (endDM (dev1 ?d1) (dev2 ?d2) (on ?don) (args ?x ?y))) (call (args ?x ?y))')
