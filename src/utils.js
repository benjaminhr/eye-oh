const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const builder = new xml2js.Builder();
const XMLHelpers = require("./XMLHelpers");

// POLYFILL: `pkg` doesn't support node@15 yet, polyfill .flatMap and .replaceAll
String.prototype.replaceAll = function (a, b) {
  return this.split(a).join(b);
};

// POLYFILL: `pkg` doesn't support node@15 yet, polyfill .flatMap and .replaceAll
Object.defineProperties(Array.prototype, {
  flatMap: {
    value: function (lambda) {
      return Array.prototype.concat.apply([], this.map(lambda));
    },
    writeable: false,
    enumerable: false,
  },
});

// promisify xml2js parseString function
function parseString(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// read and convert XML model
async function getRegisterXML(path) {
  try {
    const fileContents = fs.readFileSync(path, "utf-8");
    const json = await parseString(fileContents);
    return json;
  } catch (error) {
    console.log("Error: ", error);
    return {};
  }
}

function isPath(string) {
  return string === path.basename(string);
}

function writeXMLModel(path, JSONModel) {
  const xml = builder.buildObject(JSONModel);
  fs.writeFileSync(path, xml, "utf-8");
}

function writeRAjson(path, RA) {
  fs.writeFileSync(path, JSON.stringify(RA, null, 2), "utf-8");
}

module.exports = {
  getRegisterXML,
  parseString,
  isPath,
  writeXMLModel,
  writeRAjson,
};
