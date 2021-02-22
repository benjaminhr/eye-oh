const fs = require("fs");
const XMLHelpers = require("./XMLHelpers");

// gets JSON object representing the input XML model
// adds alternating input/output transitions+states
function addAlternatingIO(registerAutomaton) {
  let locations = XMLHelpers.get.locations(registerAutomaton);
  let transitions = XMLHelpers.get.transitions(registerAutomaton);

  // find all states with no outgoing transitions
  const finalStates = locations.flatMap((location) =>
    !transitions.some((transition) => transition.from === location.name)
      ? [location]
      : []
  );

  const newTransitions = [];
  const newLocations = [];

  let newStateLetter = "vk_";
  let newStateCounter = 0;

  for (const location of locations) {
    const outGoingTransitions = transitions.filter(
      (transition) => transition.from === location.name
    );

    // format: { "q2": [ outGoingTransition, outGoingTransition ] }
    const outGoingLocationNames = {};

    for (const outGoingTransition of outGoingTransitions) {
      const toLocation = outGoingTransition.to;

      if (outGoingLocationNames.hasOwnProperty(toLocation)) {
        outGoingLocationNames[toLocation].push(outGoingTransition);
      } else {
        outGoingLocationNames[toLocation] = [outGoingTransition];
      }
    }

    for (const outGoingLocationName of Object.keys(outGoingLocationNames)) {
      // don't add OOK transitions + states inbetween final states
      const isFinalState = finalStates.find(
        (loc) => loc.name === outGoingLocationName
      );

      if (isFinalState) {
        continue;
      }

      // if the next state, has outgoing output transitions, then don't add OOK
      // due to `.find` it only checks one of them, maybe we need to individually
      // check every next state idk
      const nextStateHasOutputs = outGoingLocationNames[
        outGoingLocationName
      ].some((transition) => {
        const hasOutputs = transitions
          .find((t) => t.from === transition.to)
          .symbol.startsWith("O");
        return hasOutputs || transition.symbol.startsWith("O");
      });

      if (nextStateHasOutputs) {
        console.log("BREAKING");
        break;
      }

      const newLocation = {
        name: newStateLetter + newStateCounter++,
      };

      // transitions which we need to point to our newLocation
      const nextTransitions = outGoingLocationNames[
        outGoingLocationName
      ].forEach((transition) => {
        transition.to = newLocation.name;
      });

      const OOKtransition = {
        from: newLocation.name,
        to: outGoingLocationName,
        symbol: "OOK",
        assignments: [],
        guard: "",
      };

      newTransitions.push(OOKtransition);
      newLocations.push(newLocation);
    }
  }

  const newFinalState = {
    name: newStateLetter + newStateCounter++,
    final: "true",
  };
  newLocations.push(newFinalState);

  if (finalStates.length === 0) {
    console.log(
      "Error: Could not determine final state(s) i.e. a state with no outgoing transitions"
    );
    process.exit(1);
  }

  for (const finalState of finalStates) {
    // for each final state, add OFinal transition to new final state
    const OFinalTransition = {
      from: finalState.name,
      to: newFinalState.name,
      symbol: "OFinal",
      assignments: [],
      guard: "",
    };

    newTransitions.push(OFinalTransition);
  }

  XMLHelpers.write.locations(registerAutomaton, [
    ...locations,
    ...newLocations,
  ]);
  XMLHelpers.write.transitions(registerAutomaton, [
    ...transitions,
    ...newTransitions,
  ]);

  XMLHelpers.write.symbols(registerAutomaton, "outputs", ["OOK", "OFinal"]);

  return registerAutomaton;
}

module.exports = addAlternatingIO;
