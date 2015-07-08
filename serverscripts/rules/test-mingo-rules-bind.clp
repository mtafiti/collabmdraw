;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;templates for callbacks
(deftemplate bindStart (slot oid) (multislot args))
;(deftemplate bindBody (slot oid) (multislot args))
(deftemplate bindEnd (slot oid) (multislot args))

;canvas bounds
(deftemplate Canvasbounds (slot right) (slot bottom))

(deftemplate Invoked (slot function) (slot oid) (slot x) (slot y) (slot device) (slot time))
(deftemplate State (slot name) (slot operation) (slot oid) (multislot args))
; To handle single-device versus multi-device operations.

;INITIALIZE CANVAS BOUNDS FIRST
; Rules for bind operation

(defrule bind-start
	; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
	; Operation priority
	(declare (salience 1001))  
	; There is no multiple activation of the same state for the same operation.
	?current-state <- (State (name "end") (oid ?oid))
	; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
	?i1 <- (Invoked (function ?function) (oid ?oid) (args ?a1) (time ?time1) (muid ?muid1) (device ?dev1))
	?i2 <- (Invoked (function ?function) (oid ?oid) (args ?a2) (time ?time2) (muid ?muid2) (device ?dev2))
	(bind ?x1 (nth$ 1 ?a1)) (bind ?y1 (nth$ 2 ?a1))
	(bind ?x2 (nth$ 1 ?a2)) (bind ?y2 (nth$ 2 ?a2))
	; WHEN
	(test (eq ?function "touch-down"))
	(test (neq ?dev1 ?dev2))
	(test (time:within ?time1 ?time2 500))
	(test (< ?time1 ?time2))
	;(not (and (Invoked (function "touch-up") (oid ?oid) (time ?time3))
	;          (test (time:before ?time3 ?time1))))
  =>
	(printout t "bind-start state activated! " ?time1 crlf)
	(retract ?i1)
	(retract ?i2)
	(retract ?current-state)
	(assert (State (name "start") (operation "bind") (oid ?oid) (args ?x1 ?y1 ?x2 ?y2)))
	(assert (bindStart (oid ?oid) (args ?x1 ?y1 ?x2 ?y2))))

(defrule bind-end
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 1001))
  ; There is no other state of an operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "bind"))))
  ; Operation's previous state is active
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name ?sname) (operation "bind") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function "touch-move")  (oid ?oid) (args ?a1) (time ?time1) (device ?dev1))
  (bind ?x1 (nth$ 1 ?a1)) (bind ?y1 (nth$ 2 ?a1))
  ?i2 <- (Invoked (function "touch-move")  (oid ?oid) (args ?a2) (time ?time2) (device ?dev2))
  (bind ?x2 (nth$ 1 ?a2)) (bind ?y2 (nth$ 2 ?a2))
  (Canvasbounds (right ?right))
  ;bind gesture
  (test (and (>= ?x1 ?right) (<= ?x2 0)))
  ;check y-values not too far apart
  (test (<= (abs (- ?y1 ?y2)) 10))
  (test (time:within ?time1 ?time2 500))
  (test (neq ?dev1 ?dev2))
  =>
  (printout t "bind-end state activated! " ?time2 " args: " ?x1 ?y1 ?x2 ?y2 crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "end") (operation "all") (oid ?oid)))
  (assert (bindEnd (oid ?oid) (args ?x1 ?y1 ?x2 ?y2))))
 ;[16:36:21] Jorge Vallejos: (assert (bindEnd (oid ?oid) (args ?x1 ?y1 ?border1 ?x2 ?y2 ?border2))))
 ;[16:41:49] Jorge Vallejos: x1 <- (nth$ 1 ?args)
 ;(assert (bindEnd (oid ?oid) (args ?args1 ?border1 ?args2 ?border2))))
 ;(assert (bindEndLR (oid ?oid) (d1 ?d1) (d2 ?d2)))
 ;you only need
 ;(assert (bindEnd (oid ?oid) (d1 ?d1) (d2 ?d2)))
 ;[16:48:50] Jorge Vallejos: (Deftemplate bindEnd (slot oid) (slot d1) (slot d2) (slot direction))
 ;direction can be LR, BT
 
 (defrule bind-body
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 1001))
  ; There is no other state of an exclusive operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "bind"))))
  ; Operation's previous state is active
  ?current-state <- (State (name ?sname) (operation "bind") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function ?function)  (oid ?oid) (x ?x1) (y ?y1) (time ?time1) (muid ?muid1))
  ; WHEN
  (test (eq ?function "touch-move"))
  (test (and (< ?x1 ?right) (> ?x2 0)))

  =>
  (printout t "bind-body state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "body") (operation "bind") (oid ?oid) (args ?x1 ?y1)))
  (assert (bindBody (oid ?oid) (args ?x1 ?y1 ?x2 ?y2))))
 
 ;bounds
 (assert (Canvasbounds (right 300) (bottom 300)))
 
 (assert (Invoked (function "touch-down") (oid "o1") (x 100) (y 100) (device "d2") (time 1)))
 (assert (Invoked (function "touch-down") (oid "o1") (x 101) (y 101) (device "d1") (time 2)))
 (assert (Invoked (function "touch-move") (oid "o1") (x 150) (y 90) (device "d2") (time 3)))
 (assert (Invoked (function "touch-move") (oid "o1") (x 70) (y 90) (device "d1") (time 4)))
 (assert (Invoked (function "touch-move") (oid "o1") (x 0) (y 90) (device "d1") (time 5)))
 (assert (Invoked (function "touch-move") (oid "o1") (x 300) (y 90) (device "d1") (time 6)))
 
 ;(load "G:/Masters/Second Year/Thesis/Work/Project/draw/serverscripts/rules/test-mingo-rules-bind.clp")