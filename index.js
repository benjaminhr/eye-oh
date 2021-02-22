const fs = require("fs");
const path = require("path");
const utils = require("./src/utils");

const inputEnable = require("./src/inputEnable");
const addAlternatingIO = require("./src/addAlternatingIO");

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

// entrypoint
(async () => {
  try {
    const JSONModel = await utils.getRegisterXML(inputModelPath);
    const alternatingIOModel = addAlternatingIO(JSONModel);
    const finalModel = inputEnable(alternatingIOModel);

    utils.writeModel(outputModelPath, finalModel);
    console.log("Wrote new model: " + outputModelName);
  } catch (error) {
    console.log(error);
  }
})();
