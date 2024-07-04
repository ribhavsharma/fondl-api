const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({
  origin: true
}))

app.get("/", (req, res) => {
  res.send("fondlin'");
});

app.get("/download", async (req, res) => {
  const { fontName, source } = req.query;
  const url = makeUrl(fontName, source);
  if (!url) {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    let fonts;
    if (source === "dafont") {
      fonts = getFontsDafont($);
    } else if (source === "befonts") {
      fonts = await getFontsBefonts($);
    }
    res.json(fonts);
  } catch (error) {
    console.error("Error fetching the font page:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the font page" });
  }
});

app.listen(port, () => {
  console.log(`fondl api listening at http://localhost:${port}`);
});

const makeUrl = (fontName, source) => {
  if (source === "dafont") {
    return `https://www.dafont.com/search.php?q=${encodeURIComponent(fontName)}`;
  } else if (source === "befonts") {
    return `https://www.befonts.com/?s=${encodeURIComponent(fontName)}`;
  }
  return null;
};

const getFontsDafont = ($) => {
  return $(".preview")
    .map((i, el) => {
      return {
        name: $(el).prevAll(".lv1left").first().text().trim(),
        preview_img:
          "https://www.dafont.com" +
          $(el)
            .css("background-image")
            .replace(/url\((['"])?(.*?)\1\)/gi, "$2"),
        download_link:
          "https://" + $(el).prev().find("a").attr("href").slice(2),
      };
    })
    .get();
};

const getFontsBefonts = async ($) => {
  const fontElements = $(".td-block-span6");

  const fonts = await Promise.all(
    fontElements
      .map(async (i, el) => {
        const fontPageUrl = $(el).find("h3").find("a").attr("href");
        const fontPageResponse = await axios.get(fontPageUrl);
        const fontPage = cheerio.load(fontPageResponse.data);

        return {
          name: $(el).find("h3").text().trim(),
          preview_img: fontPage("img").eq(3).attr("src"),
          download_link: fontPage(".download-link").attr("href"),
        };
      })
      .get(),
  );

  return fonts;
};
