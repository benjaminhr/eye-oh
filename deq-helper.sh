#!/usr/bin/env sh 

node ../index \
--input ../test_processes/"$1".pi  \
--output temp_og.register.xml \
--conversion-only

echo "Wrote og model"

node ../index \
--input temp_og.register.xml \
--output tmp/input.deq.xml \
--deq-converter

echo "Converted og model to deq"

sut_uppaal2register learnedConcreteModel.xml learned.register.xml

echo "Converted uppaal to xml"

node ../index.js \
--input learned.register.xml \
--output learned_pruned.register.xml \
--prune

echo "Pruned learned model"

node ../index \
--input learned_pruned.register.xml \
--output tmp/learned.deq.xml \
--deq-converter

echo "Converted learned to deq"

cd tmp 
deq input.deq.xml learned.deq.xml
cd ..
