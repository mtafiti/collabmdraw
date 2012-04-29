(defglobal ?*down* = 0)
(defglobal ?*move* = 1)
(defglobal ?*up* = 2)

(deftemplate (Touch (slot state) (slot dev)))
(deftemplate (startDM (slot dev1) (slot dev2)))
(deftemplate (endDM (slot dev1) (slot dev2)))
(deftemplate (Sequence (slot name)))


(defrule startDM_rule
	?t1 <- (Touch (state ?dev) (dev ?d1) (on ?on1))
	?t2 <- (Touch (state ?dev) (dev ?d2) (on ?on2))
	(test (neq ?d1 ?d2))
	(test (time:within ?t1 ?t2 500))
	(not (startDM (dev2 ?d2) (on ?on2)))
=>
	(assert (startDM (dev1 d1) (dev2 d2) (on ?on1))))
	
(defrule bodyDM_rule
	(startDM (dev ?d1) (dev ?d2))
	(not (or (endDM (dev1 ?d1) (dev2 ?d2))
			 (endDM (dev1 ?d2) (dev2 ?d1))))
	(Touch (state ?*move*) (dev ?dm))
	(test (or (= ?dm d1) 
			  (= ?dm ?d2)))
=>
	(assert (Sequence1 (name "seq1"))))

(defrule endDM_rule
	(startDM (dev1 ?d1) (dev2 ?d1))
	(Touch (state ?*up*) (dev ?dx) (on ?on1))
	(test (or (= ?dx ?d1) (= ?dx ?d2)))
=>
	(assert (endDM (dev1 ?d1) (dev2 ?d2) (on ?t2)))
) 	