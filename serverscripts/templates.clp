
(deftemplate Touch (slot x) (slot y) (slot state) (slot dev) (slot args))
(set-default-timespan "Touch" 5000)
(deftemplate startDM (slot dev1) (slot dev2) (multislot args))
(set-default-timespan "startDM" 5000)
(deftemplate endDM (slot dev1) (slot dev2)  (multislot args))
(set-default-timespan "endDM" 5000)
(deftemplate bodyDM (slot dev1) (slot dev2) (multislot args))
(set-default-timespan "bodyDM" 100)

(deftemplate Invoked (slot fn) (slot dev) (slot args))
(set-default-timespan "Invoked" 5000)

