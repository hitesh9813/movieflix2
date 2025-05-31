const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "12345";

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/movies", express.static("movies"));
app.use("/thumbnails", express.static("thumbnails"));

const movieDataPath = path.join(__dirname, "movie-data.json");
if (!fs.existsSync(movieDataPath)) fs.writeFileSync(movieDataPath, "{}");

const movieUpload = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.fieldname === "movie" ? "movies" : "thumbnails";
    cb(null, path.join(__dirname, dest));
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage: movieUpload });

app.post("/upload-movie", upload.fields([{ name: "movie" }, { name: "thumbnail" }]), (req, res) => {
  if (req.body.adminpass !== ADMIN_PASSWORD) return res.status(401).send("❌ Wrong Password");

  const movie = req.files["movie"][0];
  const thumbnail = req.files["thumbnail"][0];
  const category = req.body.category || "Uncategorized";

  const data = JSON.parse(fs.readFileSync(movieDataPath));
  data[movie.originalname] = {
    thumbnail: thumbnail.originalname,
    category,
    views: 0,
    date: new Date().toISOString().slice(0, 10)
  };
  fs.writeFileSync(movieDataPath, JSON.stringify(data, null, 2));
  res.redirect("/");
});

app.get("/movies", (req, res) => {
  const data = JSON.parse(fs.readFileSync(movieDataPath));
  const result = Object.entries(data).map(([name, d]) => ({
    name,
    ...d
  }));
  res.json(result);
});

app.get("/watch/:name", (req, res) => {
  const filePath = path.join(__dirname, "movies", req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not Found");

  const data = JSON.parse(fs.readFileSync(movieDataPath));
  if (data[req.params.name]) {
    data[req.params.name].views += 1;
    fs.writeFileSync(movieDataPath, JSON.stringify(data, null, 2));
  }

  res.send(`
    <html>
    <head><title>Watch Movie</title></head>
    <body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:black;">
      <video controls autoplay width="100%" height="100%">
        <source src="/movies/${encodeURIComponent(req.params.name)}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </body>
    </html>
  `);
});

app.get("/download/:name", (req, res) => {
  const filePath = path.join(__dirname, "movies", req.params.name);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("Not Found");
  }
});

app.listen(PORT, () => console.log(`🎬 MovieFlix running at http://localhost:${PORT}`));
