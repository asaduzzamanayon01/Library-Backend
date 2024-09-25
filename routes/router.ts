import { Router } from "express";

const { getUsers, register, login, createBooks, getBooks, logout, getDetails, handleInteraction, getGenres,
    getRecentBooks, getMostLikedBooks, isBookLikedByUser} = require("../controllers/controllers");
const {registerValidation, loginValidation} = require('../validators/auth-validators');
import { validationMiddleware } from '../middelwares/validation-middleware';
import { upload } from "../multer_conf";
const {userAuth} = require('../middelwares/passport-middlewares');


const router = Router();

//getBooks route
router.get('/books', getBooks);

//Most Recent Books route
router.get('/mostRecent', getRecentBooks);

//Most Liked Books route
router.get('/mostLiked', getMostLikedBooks);

//getGenres route
router.get('/genres', getGenres);

//registration route
router.post("/registration", registerValidation, validationMiddleware, register);
router.post("/login", loginValidation, validationMiddleware, login);
router.get('/logout', logout)

//createBooks route
router.post('/create', userAuth, upload.single('cover_img') , createBooks)

//details route
router.get('/details/:book_id', getDetails)

//users route
router.get('/users', userAuth, getUsers)

//interaction route
router.post('/interaction', userAuth, handleInteraction)

router.get('/getLikes', userAuth, isBookLikedByUser)

module.exports = router;
