const fs = require("fs");
const XMLHelpers = require("./XMLHelpers");

// gets JSON object representing the input XML model
// adds every (missing) input transition for each input state
// i.e. sets up sinks and points locations to them
function inputEnable(registerAutomaton) {
  let inputSymbols = XMLHelpers.get.symbols(registerAutomaton, "inputs");
  let locations = XMLHelpers.get.locations(registerAutomaton);
  let transitions = XMLHelpers.get.transitions(registerAutomaton);

  const newTransitions = [];

  for (let location of locations) {
    const outGoingTransitions = transitions.filter(
      (transition) => transition.from === location.name
    );

    // has outgoing input transitions
    const isAnInputState = outGoingTransitions.find((transition) =>
      transition.symbol.startsWith("I")
    );

    // do nothing to transitions with outgoing output transitions
    if (!isAnInputState) continue;

    // get symbol names into array for easier checking in next line
    // only keep transitions which are missing and don't have guards
    const outGoingTransitionSymbolNames = outGoingTransitions.flatMap((t) =>
      t.guard.length === 0 ? [t.symbol] : []
    );

    // get missing transitions, and existing transitions with guards
    // (since they have to be inverted)
    const missingTransitions = inputSymbols.filter(
      (symbol) => !outGoingTransitionSymbolNames.includes(symbol.name)
    );

    for (let missingTransition of missingTransitions) {
      const newTransition = {
        from: location.name,
        to: "sink",
        symbol: missingTransition.name,
        assignments: [],
        // params for sink state transitions "x0,...,xN"
        params: missingTransition.param.map((_, i) => `x${i + 1}`).join(","),
        guard: "",
      };

      // is the missing transition, a transition which already exists but has a guard
      // => we need to invert the guard
      let { guard } =
        outGoingTransitions.find(
          (t) => t.symbol === missingTransition.name && t.guard.length > 0
        ) || {};

      if (guard) {
        // invert all logical expressions, i.e. != to == and && to ||
        guard = guard.replaceAll("&&", "___1___");
        guard = guard.replaceAll("||", "&&");
        guard = guard.replaceAll("___1___", "||");

        guard = guard.replaceAll("==", "___1___");
        guard = guard.replaceAll("!=", "==");
        guard = guard.replaceAll("___1___", "!=");

        newTransition.guard = guard;
      }

      newTransitions.push(newTransition);
    }
  }

  // remove final state
  const finalState = (locations.find((l) => l.final) || {}).name;

  if (!finalState) {
    console.log('Remember to add `final="true" on your final location/state');
    process.exit(1);
  }

  const oFinalTransitionIndex = transitions.findIndex(
    (tran) => tran.to === finalState
  );
  // point second last state to sink_two with OFinal transition
  transitions[oFinalTransitionIndex].to = "sink_two";

  // remove old final state
  locations = locations.filter((loc) => loc.name != finalState);
  // json["register-automaton"].locations[0].location = json[
  //   "register-automaton"
  // ].locations[0].location.filter((loc) => loc["$"].name != finalState);

  // add all input transitions from sink_two to sink
  inputSymbols.forEach((symbol) => {
    const newTransition = {
      from: "sink_two",
      to: "sink",
      symbol: symbol.name,
      assignments: [],
      // params for sink state transitions "x0,...,xN"
      params: symbol.param.map((_, i) => `x${i + 1}`).join(","),
      guard: "",
    };

    newTransitions.push(newTransition);
  });

  // add dummy output transition from sink to sink_two
  const newTransition = {
    from: "sink",
    to: "sink_two",
    symbol: "ODummy",
    assignments: [],
    guard: "",
  };

  newTransitions.push(newTransition);

  XMLHelpers.write.symbols(registerAutomaton, "outputs", ["ODummy"]);

  // json["register-automaton"].alphabet[0].outputs[0].symbol.push({
  //   $: {
  //     name: "ODummy",
  //   },
  // });

  XMLHelpers.write.locations(registerAutomaton, [
    ...locations,
    { name: "sink" },
    { name: "sink_two" },
  ]);

  // json["register-automaton"].locations[0].location.push({
  //   $: {
  //     name: "sink",
  //   },
  // });

  // json["register-automaton"].locations[0].location.push({
  //   $: {
  //     name: "sink_two",
  //   },
  // });

  // map back to XML json format

  const newTransitionsXML = [...transitions, ...newTransitions];
  XMLHelpers.write.transitions(registerAutomaton, newTransitionsXML);
  // const newTransitionsXML = [...transitions, ...newTransitions].map(
  //   (transition) => {
  //     const newFormat = {
  //       $: {
  //         from: transition.from,
  //         to: transition.to,
  //         symbol: transition.symbol,
  //       },
  //     };

  //     if (transition.params && transition.params.length) {
  //       newFormat["$"].params = transition.params;
  //     }

  //     if (transition.guard) {
  //       newFormat.guard = [transition.guard + "\n      "];
  //     }

  //     if (transition.assignments.length) {
  //       newFormat.assignments = [
  //         {
  //           assign: transition.assignments.map((ass) => ({
  //             _: ass.reg,
  //             $: {
  //               to: ass.to,
  //             },
  //           })),
  //         },
  //       ];
  //     }

  //     return newFormat;
  //   }
  // );

  // json["register-automaton"].transitions[0].transition = [...newTransitionsXML];

  return registerAutomaton;
}

module.exports = inputEnable;
