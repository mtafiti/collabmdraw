; GESTURE-BASED OPERATIONS        
;
; Structure:
; - manage priority (assert priority level, check blocking conditions)
; - match facts (e.g. function invocations)
; =>
; - switch state
; - trigger callback
; - manage priority (assert blocking conditions)
;
; Two things are tested here:
; - A priority-based activation of rules of an operation
; - The adequate activation of exclusive/inclusive operations
; 
; (load "examples/test-resize-move-unique-state-timespan.clp")

; RULES

(deftemplate Invoked (slot function) (slot oid) (slot args) (slot device))
(deftemplate State (slot name) (slot operation) (slot oid) (multislot args))
; To handle single-device versus multi-device operations.
(deftemplate Composite-event-invocation (slot oid) (slot invocation))
(deftemplate Single-event-invocation (slot oid) (slot invocation))

;templates for callbacks
(deftemplate resizeStart (slot oid) (multislot args))
(deftemplate resizeBody (slot oid) (multislot args))
(deftemplate resizeEnd (slot oid) (multislot args))

; Rules for resize operation

(defrule resize-start
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 2001))
  ; Operation's current state
  ; There is no other state of an operation which is currently active.
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name "end") (oid ?oid))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function ?function) (oid ?oid) (args ?args1) (time ?time1) (muid ?muid1)
           (device ?dev1))
  ?i2 <- (Invoked (function ?function) (oid ?oid) (args ?args2) (time ?time2) (muid ?muid2)
           (device ?dev2))
  ; WHEN
  (test (eq ?function "touch-down"))
  (test (neq ?dev1 ?dev2))
  (test (time:within ?time1 ?time2 500))
  (test (< ?time1 ?time2))
  ;(not (and (Invoked (function "touch-up") (oid ?oid) (time ?time3))
  ;          (test (time:before ?time3 ?time1))))
  =>
  (printout t "resize-start state activated! " ?time1 " args1: " ?args1 " args2: " ?args2 crlf)
  (retract ?i1)
  (retract ?i2)
  (retract ?current-state)
  (assert (State (name "start") (operation "resize") (oid ?oid) (args ?args1 ?args2)))
  (assert (resizeStart (oid ?oid) (args ?args1 ?args2))))

(defrule resize-body
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 2001))
  ; There is no other state of an exclusive operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "resize"))))
  ; Operation's previous state is active
  ?current-state <- (State (name ?sname) (operation "resize") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function ?function) (oid ?oid) (args ?args) (time ?time) (muid ?muid))
  ; WHEN
  (test (eq ?function "touch-move"))
  =>
  (printout t "resize-body state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "body") (operation "resize") (oid ?oid) (args ?args)))
  (assert (resizeBody (oid ?oid) (args $?args1))))

(defrule resize-end
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 2001))
  ; There is no other state of an operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "resize"))))
  ; Operation's previous state is active
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name ?sname) (operation "resize") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function "touch-up") (oid ?oid) (args ?args) (time ?time) (muid ?muid))
  =>
  (printout t "resize-end state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "end") (operation "all") (oid ?oid)))
  (assert (resizeEnd (oid ?oid) (args ?args1 ?args2))))
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

;templates for callbacks
(deftemplate rorateStart (slot oid) (multislot args))
(deftemplate rotateBody (slot oid) (multislot args))
(deftemplate rotateEnd (slot oid) (multislot args))

; Rules for resize operation

(defrule rotate-start
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 3001))  
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name "end") (oid ?oid))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function ?function) (oid ?oid) (args ?args1) (time ?time1) (muid ?muid1)
           (device ?dev1))
  ?i2 <- (Invoked (function ?function) (oid ?oid) (args ?args2) (time ?time2) (muid ?muid2)
           (device ?dev2))
  ; WHEN
  (test (eq ?function "touch-down"))
  (test (neq ?dev1 ?dev2))
  (test (time:within ?time1 ?time2 500))
  (test (< ?time1 ?time2))
  ;(not (and (Invoked (function "touch-up") (oid ?oid) (time ?time3))
  ;          (test (time:before ?time3 ?time1))))
  =>
  (printout t "rotate-start state activated! " ?time1 " args1: " ?args1 " args2: " ?args2 crlf)
  (retract ?i1)
  (retract ?i2)
  (retract ?current-state)
  (assert (State (name "start") (operation "rotate") (oid ?oid) (args ?args1 ?args2)))
  (assert (rotateStart (oid ?oid) (args ?args1 ?args2))))

(defrule rotate-body
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 2001))
  ; There is no other state of an exclusive operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "rotate"))))
  ; Operation's previous state is active
  ?current-state <- (State (name ?sname) (operation "resize") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function ?function) (oid ?oid) (args ?args) (time ?time) (muid ?muid))
  ; WHEN
  (test (eq ?function "touch-move"))
  =>
  (printout t "resize-body state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "body") (operation "resize") (oid ?oid) (args ?args)))
  (assert (resizeBody (oid ?oid) (args $?args1))))

(defrule resize-end
  ; STATE HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ; Operation priority
  (declare (salience 2001))
  ; There is no other state of an operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "resize"))))
  ; Operation's previous state is active
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name ?sname) (operation "resize") (oid ?oid) (args ?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING ;;;;;;;;;;;;;;;;;;;;;
  ?i1 <- (Invoked (function "touch-up") (oid ?oid) (args ?args) (time ?time) (muid ?muid))
  =>
  (printout t "resize-end state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "end") (operation "all") (oid ?oid)))
  (assert (resizeEnd (oid ?oid) (args ?args1 ?args2))))
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;A26-07-12_11.19.MINGO.EXTENDED.2.amr 39:30 or 39:50
(defrule preempt-invocation
  (declare (salience 1000))
  (Invoked (oid ?oid) (muid ?muid) (time ?time))
  =>
  (assert (Composite-event-invocation (oid ?oid) (timespan 3) (invocation ?muid) (time ?time))))

(defrule restore-invocation
  (declare (salience 1000))
  (Invoked (oid ?oid) (muid ?muid))
  (not (Composite-event-invocation (oid ?oid) (invocation ?muid)))
  =>
  (assert (Single-event-invocation (oid ?oid) (timespan 0.1)  (invocation ?muid))))

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

; Rules for move operation
(defrule move-start
  ; STATE HANDLING
  ; Declare operation priority (salience)
  (declare (salience 0))
  ; There is no other state of an exclusive operation which is currently active.
  ; There is no multiple activation of the same state for the same operation.
  ?current-state <- (State (name "end") (oid ?oid))
  ; INVOCATION HANDLING
  ; Invocations
  ?i1 <- (Invoked (function "touch-down") (oid ?oid) (args $?args) (time ?time) (muid ?muid)
           (device ?dev))
  (Single-event-invocation (oid ?oid) (invocation ?muid))
  =>
  (printout t "move-start state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "start") (operation "move") (oid ?oid) (args $?args))))

(defrule move-body
  ; STATE HANDLING
  ; Declare operation priority (salience)
  (declare (salience 0))
  ; There is no other state of an exclusive operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid))
            (test (neq ?oname "move"))))
  ; Operation's previous state is active
  ?current-state <- (State (name ?sname) (operation "move") (oid ?oid) (args $?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; perhaps commenting the following line is tricky but it allows moving after resizing/rotating. To explore. 
  ;(test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING
  ; Invocations
  ?i1 <- (Invoked (function "touch-move") (oid ?oid) (args $?args) (time ?time) (muid ?muid))
  ;(Single-event-invocation (oid ?oid) (invocation ?muid))
  =>
  (printout t "move-body state activated! " ?time " args: " ?args crlf)
  (retract ?i1)
  (retract ?current-state)
  (assert (State (name "body") (operation "move") (oid ?oid) (args $?args))))

(defrule move-end
  ; STATE HANDLING
  ; Declare operation priority (salience)
  (declare (salience 0))
  ; There is no other state of an exclusive operation which is currently active.
  (not (and (State (operation ?oname) (oid ?oid)) 
            (test (neq ?oname "move"))))
  ; There is no multiple activation of the same state for the same operation.
  ; Operation's previous state is active
  ?current-state <- (State (name ?sname) (operation "move") (oid ?oid) (args $?sargs))
  (test (or (eq ?sname "start") (eq ?sname "body")))
  ; INVOCATION HANDLING
  ; Invocations
  ?i1 <- (Invoked (function "touch-up") (oid ?oid) (args $?args) (time ?time) (muid ?muid))
  ;(Single-event-invocation (oid ?oid) (invocation ?muid))
  =>
  (printout t "move-end state activated! " ?time " args: " ?args crlf)
  (retract ?current-state)
  (retract ?i1)
  (assert (State (name "end") (operation "all") (oid ?oid) (args $?args) )))

(printout t "rules loaded!" crlf)

; FACTS

(assert (State (name "end") (operation "all") (oid "o1") (args 0 0)))
;(set-default-timespan Invoked 3)
(assert (Invoked (function "touch-down") (oid "o1") (args 1 40) (device "d2") (time 1)))
(assert (Invoked (function "touch-move") (oid "o1") (args 2 66) (device "d2") (time 2)))
;(assert (Invoked (function "touch-down") (oid "o1") (args 3 40) (device "d1") (time 3)))
(assert (Invoked (function "touch-move") (oid "o1") (args 4 66) (device "d1") (time 4)))
(assert (Invoked (function "touch-move") (oid "o1") (args 5 66) (device "d2") (time 5)))
(assert (Invoked (function "touch-move") (oid "o1") (args 6 67) (device "d1") (time 6)))
(assert (Invoked (function "touch-up") (oid "o1") (args 7 69) (device "d1") (time 7)))
(assert (Invoked (function "touch-move") (oid "o1") (args 8 66) (device "d2") (time 8)))

(facts)