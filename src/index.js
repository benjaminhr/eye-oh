const fs = require("fs");
const path = require("path");
const utils = require("./utils");

const inputEnable = require("./inputEnable");
const addAlternatingIO = require("./addAlternatingIO");

const inputModelName = process.argv[2];
const outputModelName = process.argv[3];

if (!inputModelName || !outputModelName) {
  console.log("Provide a path to the model and an output model name");
  console.log("$ eye-oh input.model.xml output.model.xml");
  process.exit(1);
}

const inputModelPath = path.resolve(process.cwd(), inputModelName);
const outputModelPath = path.resolve(process.cwd(), outputModelName);

if (!fs.existsSync(inputModelPath)) {
  console.log(`Error: Cannot find input model "${inputModelPath}"`);
}

utils
  .getRegisterXML(inputModelPath)
  .then((JSONModel) => addAlternatingIO(JSONModel))
  .then((alternatingIOModel) => inputEnable(alternatingIOModel))
  .then((finalModel) => utils.writeModel(outputModelPath, finalModel))
  .then(() => console.log("Wrote new model: " + outputModelName))
  .catch(console.log);
