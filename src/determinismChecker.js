const XMLHelpers = require("./XMLHelpers");

function isDeterministic(JSONModel) {
  const RA = XMLHelpers.all(JSONModel);

  for (const location of RA.locations) {
    const outGoingTransitions = RA.transitions.filter(
      (transition) => transition.from === location.name
    );

    const transitions = {}; // { symbol: [transitionsWithSymbol] }

    for (const transition of outGoingTransitions) {
      const symbol = transition.symbol;

      if (transitions.hasOwnProperty(symbol)) {
        if (symbol.includes("IKnown")) {
          const transitionExists = transitions[symbol].find(
            (existingTran) => existingTran.guard === transition.guard
          );

          if (transitionExists) {
            console.log("Not deterministic", transitionExists);
            // return false;
          }
        } else if (symbol.includes("IFresh")) {
          const transitionExists = transitions[symbol].find((existingTran) => {
            const g1 = existingTran.guard.split("&&")[0];
            const g2 = transition.guard.split("&&")[0];
            return g1 === g2;
          });

          if (transitionExists) {
            console.log("Not deterministic", transition);
            // return false;
          }
        } else {
          if (transition.symbol === "ITau") {
            console.log("Not deterministic", transition);
            // return false;
          }
        }

        transitions[symbol].push(transition);
      } else {
        transitions[symbol] = [transition];
      }
    }
  }

  // return true;
}

module.exports = isDeterministic;
