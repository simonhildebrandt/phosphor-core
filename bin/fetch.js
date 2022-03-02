const fs = require("fs");
const path = require("path");
const ejs = require('ejs');
const axios = require("axios");
const chalk = require("chalk");
const semver = require('semver')
const camelCase = require('camelcase');

const { version } = require("../package.json");


const ICON_API_URL = "https://api.phosphoricons.com";

class GenerationError extends Error {};


async function generateManifest() {
  let res;

  try {
    res = await axios.get(ICON_API_URL);
  } catch(err) {
    throw new GenerationError("Error collecting icons from API - " + err.message);
  }

  const { data: { icons } = {} } = res;

  if (!icons) throw new GenerationError("No icon data from API");

  const helpers = {
    iconCategories: cats => cats.map(c => `IconCategory.${c.toUpperCase()}`).join(','),
    iconTags: (tags, publishedIn) => JSON.stringify([
      ...(semver.coerce(publishedIn) == version ? ['*new*'] : []),
      ...tags
    ]),
    semVer: publishedIn => semver.coerce(publishedIn),
    iconComponent: name => `Icons.${camelCase(name, {pascalCase: true})}`
  };

  ejs.renderFile(
    'bin/collection.ejs',
    { icons, ...helpers },
   (err, str) => {
      if (err) throw new GenerationError("Error rendering template - " + err.message);
      fs.writeFileSync(
        path.join(__dirname, "../src/icons.ts"),
        str.toString()
      );
    }
  );

  return icons.length;
}

generateManifest().then(
  total => console.log(`${chalk.green(" DONE ")} ${total} icons ingested`)
).catch(err => {
  if (err instanceof GenerationError) {
    console.error(`${chalk.inverse.red(" ERROR ")} ${err.message}`);
  } else {
    console.error(`${chalk.inverse.red(" FATAL ")} ${err.message}`);
  }
});
