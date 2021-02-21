module.exports = {
  get: {
    symbols: (json, type) => {
      // type = "inputs" | "outputs"
      if (!type) return console.log("Error: symbol type missing");
      if (!json["register-automaton"].alphabet[0].hasOwnProperty(type))
        return [];

      return json["register-automaton"].alphabet[0][type][0].symbol.map(
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
    },

    locations: (json) => {
      return json["register-automaton"].locations[0].location.map((loc) => ({
        name: loc["$"].name,
        ...(loc["$"].initial && { initial: "true" }),
        ...(loc["$"].final && { final: "true" }),
      }));
    },

    transitions: (json) => {
      return json["register-automaton"].transitions[0].transition.map(
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
    },
  },

  write: {
    symbols: (json, type, newSymbols) => {
      // type = "inputs" | "outputs"
      if (!type) return console.log("Error: symbol type missing");

      // output property missing
      if (
        type === "outputs" &&
        !json["register-automaton"].alphabet[0].hasOwnProperty("outputs")
      ) {
        json["register-automaton"].alphabet[0].outputs = [{ symbol: [] }];
      }

      for (const newSymbol of newSymbols) {
        json["register-automaton"].alphabet[0][type][0].symbol.push({
          $: {
            name: newSymbol,
          },
        });
      }
    },

    locations: (json, newLocations) => {
      json["register-automaton"].locations[0].location = newLocations.map(
        (location) => ({
          $: {
            name: location.name,
            ...(location.initial && { initial: "true" }),
            ...(location.final && { final: "true" }),
          },
        })
      );
    },

    transitions: (json, newTransitions) => {
      json["register-automaton"].transitions[0].transition = newTransitions.map(
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
    },
  },
};
