const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const e = require("express");

const app = express();

const port = process.env.PORT;

//Middleware
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

//mongo connection
const conn = mongoose.createConnection(process.env.MONGODB_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

//Init gfs
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create Storage engine
const storage = new GridFsStorage({
  url: process.env.MONGODB_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = file.originalname;
      const fileInfo = {
        filename: filename,
        bucketName: "uploads",
      };
      resolve(fileInfo);
    });
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  //res.json({ file: req.file });
  res.redirect("/");
});

app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }

    // Files exist
    return res.json(files);
  });
});

app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exist",
      });
    }
    if (
      file.contentType === "application/pdf" ||
      file.contentType === "application/txt"
    ) {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: "No image found" });
    }
  });
});

app.get("/audio/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exist",
      });
    }
    if (file.contentType === "audio/mpeg") {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: "No image found" });
    }
  });
});

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exist",
      });
    }
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: "No image found" });
    }
  });
});

app.delete("/files/:id", (req, res) => {
  gfs.remove({ _id: req.params.id, root: "uploads" }, (err, gridStore) => {
    if (err) {
      return res.status(404).send(err);
    }
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log("server is running on " + port);
});
