const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const builder = new xml2js.Builder();

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
    const inputSymbols = registerAutomaton.alphabet[0].inputs[0].symbol.map(
      (obj) => {
        return {
          symbol: obj["$"]["name"],
          params: obj["param"] ? obj["param"].map((obj) => obj["$"].name) : [],
        };
      }
    );

    const outputSymbols = registerAutomaton.alphabet[0].outputs[0].symbol.map(
      (obj) => {
        return {
          symbol: obj["$"]["name"],
          params: obj["param"] ? obj["param"].map((obj) => obj["$"].name) : [],
        };
      }
    );

    const locations = registerAutomaton.locations[0].location.map(
      (loc) => loc["$"].name
    );

    let transitions = registerAutomaton.transitions[0].transition.map(
      (transition) => {
        const transInfo = transition["$"];
        return {
          from: transInfo.from,
          to: transInfo.to,
          symbol: transInfo.symbol,
          params: transition.params
            ? transition.params.replace(/\s+/g, "").split(",")
            : [],
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

    // const xml = builder.buildObject(json);
    // const outputModelPath = path.resolve(process.cwd(), outputModelName);

    // fs.writeFile(outputModelPath, xml, (err, data) => {
    //   if (err) console.log(err);
    //   console.log("Wrote new model: " + outputModelName);
    // });
  });
});
