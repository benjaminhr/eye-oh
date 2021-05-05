#!/usr/bin/env sh 

eye-oh \
--input ../processes/"$1".pi  \
--output temp_og.register.xml \
--conversion-only

echo "Wrote og model"

eye-oh \
--input temp_og.register.xml \
--output tmp/input.deq.xml \
--deq-converter

echo "Converted og model to deq"

sut_uppaal2register learnedConcreteModel.xml learned.register.xml

echo "Converted uppaal to xml"

eye-oh \
--input learned.register.xml \
--output learned_pruned.register.xml \
--prune

echo "Pruned learned model"

eye-oh \
--input learned_pruned.register.xml \
--output tmp/learned.deq.xml \
--deq-converter

echo "Converted learned to deq"

cd tmp 
deq input.deq.xml learned.deq.xml
cd ..
