
(deftemplate testFact (slot name))

(defrule testr
    (testFact (name "test"))
    (testFact (name "test2"))
    =>
    (printout t "Test rule called" crlf)
)

;(assert (testFact (name "test"))
;(assert (testFact (name "test2"))

;(load "serverscripts/test.clp")