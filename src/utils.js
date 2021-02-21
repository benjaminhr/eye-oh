const fs = require("fs");
const xml2js = require("xml2js");

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

module.exports = {
  getRegisterXML,
  parseString,
};
