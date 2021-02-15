const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const builder = new xml2js.Builder();

/*

  - initial state must have `initial="true"`
  - final state must have `final="true"`
  - relies on input transitions starting with I, output with O (as does Tomte)
  - relies on the final state having a single incoming OFINAL transition
*/

const inputModelName = process.argv[2];
const outputModelName = process.argv[3];

if (!inputModelName || !outputModelName) {
  console.log("Provide a path to the model and an output model name");
  console.log("$ eye-oh input.model.xml output.model.xml");
  process.exit(1);
}

const inputModelPath = path.resolve(process.cwd(), inputModelName);

fs.readFile(inputModelPath, "utf-8", (err, data) => {
  if (err) console.log(err);

  xml2js.parseString(data, (err, json) => {
    if (err) console.log(err);

    const registerAutomaton = json["register-automaton"];

    let inputSymbols = registerAutomaton.alphabet[0].inputs[0].symbol.map(
      (obj) => {
        return {
          name: obj["$"]["name"],
          param: obj["param"]
            ? obj["param"].map((obj) => ({
                name: obj["$"].name,
                type: obj["$"].type,
              }))
            : [],
        };
      }
    );

    let locations = registerAutomaton.locations[0].location.map((loc) => ({
      name: loc["$"].name,
      initial: loc["$"].initial ? loc["$"].initial : false,
      final: loc["$"].final ? loc["$"].final : false,
    }));

    let transitions = registerAutomaton.transitions[0].transition.map(
      (transition) => {
        const transInfo = transition["$"];
        return {
          from: transInfo.from,
          to: transInfo.to,
          symbol: transInfo.symbol,
          params: transInfo.params ? transInfo.params : "",
          assignments: transition.assignments
            ? transition.assignments[0].assign.map((ass) => ({
                reg: ass["_"],
                to: ass["$"].to,
              }))
            : [],
          guard: transition.guard ? transition.guard[0].trim() : "",
        };
      }
    );

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
          params: missingTransition.param
            .map((o) => o.name)
            .join(",")
            .replaceAll("p", "x"),
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
    const finalState = locations.find((l) => l.final).name;
    const oFinalTransitionIndex = transitions.findIndex(
      (tran) => tran.to === finalState
    );
    // point second last state to sink_two with OFinal transition
    transitions[oFinalTransitionIndex].to = "sink_two";

    // remove old final state
    json["register-automaton"].locations[0].location = json[
      "register-automaton"
    ].locations[0].location.filter((loc) => loc["$"].name != finalState);

    // add all input transitions from sink_two to sink
    inputSymbols.forEach((symbol) => {
      const newTransition = {
        from: "sink_two",
        to: "sink",
        symbol: symbol.name,
        assignments: [],
        params: symbol.param
          .map((o) => o.name)
          .join(",")
          .replaceAll("p", "x"),
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
    json["register-automaton"].alphabet[0].outputs[0].symbol.push({
      $: {
        name: "ODummy",
      },
    });

    json["register-automaton"].locations[0].location.push({
      $: {
        name: "sink",
      },
    });

    json["register-automaton"].locations[0].location.push({
      $: {
        name: "sink_two",
      },
    });

    // map back to XML json format
    const newTransitionsXML = [...transitions, ...newTransitions].map(
      (transition) => {
        const newFormat = {
          $: {
            from: transition.from,
            to: transition.to,
            symbol: transition.symbol,
          },
        };

        if (transition.params && transition.params.length) {
          newFormat["$"].params = transition.params;
        }

        if (transition.guard) {
          newFormat.guard = [transition.guard + "\n      "];
        }

        if (transition.assignments.length) {
          newFormat.assignments = [
            {
              assign: transition.assignments.map((ass) => ({
                _: ass.reg,
                $: {
                  to: ass.to,
                },
              })),
            },
          ];
        }

        return newFormat;
      }
    );

    json["register-automaton"].transitions[0].transition = [
      ...newTransitionsXML,
    ];

    const xml = builder.buildObject(json);
    const outputModelPath = path.resolve(process.cwd(), outputModelName);

    fs.writeFile(outputModelPath, xml, (err, data) => {
      if (err) console.log(err);
      console.log("Wrote new model: " + outputModelName);
    });
  });
});
