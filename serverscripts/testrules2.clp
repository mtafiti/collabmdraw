(defglobal ?*down* = 0)
(defglobal ?*move* = 1)
(defglobal ?*up* = 2)

(deftemplate Touch (slot x) (slot y) (slot state) (slot dev))
(deftemplate startDM (slot dev1) (slot dev2))
(deftemplate endDM (slot dev1) (slot dev2))
(deftemplate Sequence (slot name))

(defrule startDM_rule
	?r1 <- (Touch (state 0) (dev ?d1) (on ?on1))
	?r2 <- (Touch (state 0) (dev ?d2) (on ?on2))
	(test (neq ?d1 ?d2))
	(test (time:within ?on1 ?on2 500))
	(not (startDM (dev1 ?d2) (on ?on2)))
=>
	(assert (startDM (dev1 ?d1) (dev2 ?d2) (on ?on1))))

(defrule bodyDM_rule
	(startDM (dev1 ?d1) (dev2 ?d2))
	(not (or (endDM (dev1 ?d1) (dev2 ?d2))
	(endDM (dev1 ?d2) (dev2 ?d1))))
	(Touch (state 1) (dev ?dm))
	(test (or (= ?dm ?d1)
	(= ?dm ?d2)))
=>
	(assert (Sequence (name "seq1")))
)
(defrule endDM_rule
	(startDM (dev1 ?d1) (dev2 ?d2) (on ?don))
	(Touch (state 2) (dev ?dx) (on ?on1))
	(test (or (= ?dx ?d1) (= ?dx ?d2)))
	(not (endDM (dev1 ?d1) (dev2 ?d2) (on ?don)))
=>
	(assert (endDM (dev1 ?d1) (dev2 ?d2) (on ?don)))
) 


(assert (Touch (x 0) (y 0) (state 0) (dev 0)))
(assert (Touch (x 5) (x 5) (state 0) (dev 1)))
(assert (Touch (x 0) (y 0) (state 1) (dev 0)))
(assert (Touch (x 0) (y 0) (state 1) (dev 0)))
(assert (Touch (x 0) (y 0) (state 1) (dev 0)))
(assert (Touch (x 0) (y 0) (state 2) (dev 0)))
(assert (Touch (x 5) (x 5) (state 2) (dev 1)))
