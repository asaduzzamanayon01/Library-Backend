import multer from "multer";
import path from "path";

// Configure where and how to store the uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads"); // The folder where images will be stored
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Define upload middleware
const upload = multer({ storage: storage });

// Export it so you can use it in your routes
export { upload };
