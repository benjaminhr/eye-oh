// const fs = require("fs");
// const path = require("path");
// const xml2js = require("xml2js");
// const builder = new xml2js.Builder();

// const inputModelName = process.argv[2];
// const outputModelName = process.argv[3];

// if (!inputModelName || !outputModelName) {
//   console.log("Provide a path to the model and an output model name");
//   console.log("$ removoq input.model.xml output.model.xml");
//   process.exit(1);
// }

// const inputModelPath = path.resolve(process.cwd(), inputModelName);

// fs.readFile(inputModelPath, "utf-8", (err, data) => {
//   if (err) console.log(err);

//   xml2js.parseString(data, (err, json) => {
//     if (err) console.log(err);

//     let locations = json.nta.template[0].location;
//     let transitions = json.nta.template[0].transition;

//     for (let i = 0; i < transitions.length - 1; i++) {
//       const currentTransition = transitions[i];
//       const nextTransition = transitions[i + 1];

//       const foundOq = nextTransition.label.find((l) => {
//         return Object.values(l).includes("Oquiescence()");
//       });

//       if (foundOq) {
//         const locationId = currentTransition.target[0]["$"]["ref"];
//         locations = locations.filter((loc) => loc["$"].id !== locationId);
//         transitions[i] = false;
//         transitions[i + 1] = false;
//       }
//     }

//     json.nta.template[0].transition = transitions.filter((tran) => tran);
//     json.nta.template[0].location = locations;

//     const xml = builder.buildObject(json);
//     const outputModelPath = path.resolve(process.cwd(), outputModelName);

//     fs.writeFile(outputModelPath, xml, (err, data) => {
//       if (err) console.log(err);
//       console.log("Wrote new model: " + outputModelName);
//     });
//   });
// });
