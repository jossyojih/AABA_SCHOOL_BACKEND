const multer = require("multer");
const path = require("path");

// Multer config
module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".pdf") {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});