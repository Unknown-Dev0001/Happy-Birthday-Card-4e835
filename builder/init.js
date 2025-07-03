const axios = require("axios").default;
const path = require("path");
const fs = require("fs");
const setPic = require("./getPic");
const genIndex = require("./genIndex");
const {
  generateMarkupLocal,
  generateMarkupRemote,
} = require("./generateMarkup");

require("dotenv").config();

if (!process.env.NAME) throw new Error("Please specify NAME in environment.");
if (!process.env.PIC) throw new Error("Please specify PIC in environment.");

const picPath = process.env.PIC;
const msgPath = process.env.SCROLL_MSG;

// Local initialization
const setLocalData = async () => {
  try {
    const pic = path.join(__dirname, "../local/", picPath);
    let markup = "";
    if (msgPath) {
      const text = fs.readFileSync(path.join(__dirname, "../local/", msgPath), {
        encoding: "utf-8",
      });
      markup = generateMarkupLocal(text);
    }
    await setPic(pic);
    genIndex(markup);
  } catch (e) {
    console.error("Error during local init:", e);
    throw new Error(e.message);
  }
};

// Remote initialization
const setRemoteData = async () => {
  try {
    // Download picture from remote URL
    let res = await axios.get(picPath, {
      responseType: "arraybuffer",
    });
    const pic = res.data;
    let markup = "";

    // If SCROLL_MSG (Telegraph link or slug) is provided
    if (msgPath) {
      const article = msgPath.split("/").pop();

      res = await axios.get(
        `https://api.telegra.ph/getPage/${article}?return_content=true`
      );

      const result = res?.data?.result;

      if (!result || !result.content) {
        console.error("❌ Telegraph API response missing content:");
        console.error(JSON.stringify(res.data, null, 2));
        throw new Error("Telegraph page content is missing or invalid.");
      }

      const { content } = result;

      markup = content.reduce(
        (string, node) => string + generateMarkupRemote(node),
        ""
      );
    }

    await setPic(pic);
    genIndex(markup);
  } catch (e) {
    console.error("❌ Error during remote init:", e);
    throw new Error(e.message);
  }
};

// Run the appropriate mode
if (process.argv[2] === "--local") {
  setLocalData();
} else if (process.argv[2] === "--remote") {
  setRemoteData();
} else {
  console.log("⚠️ Fetch mode not specified. Use '--local' or '--remote'.");
}
