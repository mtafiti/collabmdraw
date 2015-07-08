(defglobal ?*down* = 0)
(defglobal ?*move* = 1)
(defglobal ?*up* = 2)

(set-default-timespan "Touch" 5000)
(deftemplate Touch (slot x) (slot y) (slot state) (slot dev) (slot args))
(set-default-timespan "startDM" 5000)
(deftemplate startDM (slot dev1) (slot dev2) (multislot args))
(set-default-timespan "endDM" 5000)
(deftemplate endDM (slot dev1) (slot dev2)  (multislot args))
(set-default-timespan "bodyDM" 100)
(deftemplate bodyDM (slot dev1) (slot dev2) (multislot args))



(defrule startDM_rule
	?r1 <- (Touch (state 0) (dev ?d1) (on ?on1) (args ?t_arg1))
	?r2 <- (Touch (state 0) (dev ?d2) (on ?on2) (args ?t_arg2))
	(test (neq ?d1 ?d2))
	(test (time:within ?on1 ?on2 500))
	(not (startDM (dev1 ?d1) (on ?on1)))

	(not (and (Touch (state 2) (dev ?d1) (on ?on3))
	          (test (time:before ?on2 ?on3))))
=>
    (printout t "startDM 1" crlf)
	(assert (startDM (dev1 ?d1) (dev2 ?d2) (on ?on1) (args ?t_arg1 ?t_arg2)))
)

(defrule startDM2_rule
	?r1 <- (Touch (state 0) (dev ?d1) (on ?on1) (args ?t_arg1))
	?r2 <- (Touch (state 1) (dev ?d2) (on ?on2) (args ?t_arg2))
	(test (neq ?d1 ?d2))
	(test (time:within ?on1 ?on2 500))
	(not (startDM (dev1 ?d1) (on ?on1)))
	(not (and (Touch (state 2) (dev ?d1) (on ?on3))
	          (test (time:before ?on2 ?on3))))
=>
    (printout t "startDM 2" crlf)
	(assert (startDM (dev1 ?d1) (dev2 ?d2) (on ?on1) (args ?t_arg1 ?t_arg2)))
)

(defrule bodyDM_rule
	(startDM (dev1 ?d1) (dev2 ?d2) (on ?don))
	(not (or (endDM (dev1 ?d1) (dev2 ?d2) (on ?don))
			(endDM (dev1 ?d2) (dev2 ?d1)  (on ?don))))
	(Touch (state 1) (dev ?dm) (args ?t_arg))
	(test (or (eq ?dm ?d1)
				(eq ?dm ?d2)))
=>
	(assert (bodyDM (dev1 ?d1) (dev2 ?d2) (args ?t_arg)))
)
(defrule endDM_rule
	(startDM (dev1 ?d1) (dev2 ?d2) (on ?don))
	(Touch (state 2) (dev ?dx) (on ?on1) (args ?t_arg))
	(test (or (eq ?dx ?d1) (eq ?dx ?d2)))
	(not (endDM (dev1 ?d1) (dev2 ?d2) (on ?don)))
=>
    (printout t "endDM" crlf)
	(assert (endDM (dev1 ?d1) (dev2 ?d2) (on ?don) (args ?t_arg)))
)


