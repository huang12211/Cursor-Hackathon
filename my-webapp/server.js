const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/contact", (req, res) => {
  res.redirect("/checklist");
});

const pages = {
  "/": "home.html",
  "/setup": "setup.html",
  "/checklist": "checklist.html",
  "/features": "features.html",
  "/pricing": "pricing.html",
  "/about": "about.html",
  "/contact": "contact.html",
};

for (const [route, file] of Object.entries(pages)) {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, "pages", file));
  });
}

app.listen(PORT, () => {
  console.log(`Marrymap running at http://localhost:${PORT}`);
});
