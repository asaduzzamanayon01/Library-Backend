import { Router } from "express";

const { getUsers, register, login, createBooks, getBooks, logout, getDetails, handleInteraction, getGenres,
    getRecentBooks, getMostLikedBooks, isBookLikedByUser, editBooks, deleteBook} = require("../controllers/controllers");
const { getBooksElastic, getGenresElastic, getRecentBooksElastic, getMostLikedBooksElastic,
    getDetailsElastic, getUsersElastic, isBookLikedByUserElastic
 } = require("../controllers/controllers_elastic");
const {registerValidation, loginValidation} = require('../validators/auth-validators');
import { validationMiddleware } from '../middelwares/validation-middleware';
import { upload } from "../multer_conf";
const {userAuth} = require('../middelwares/passport-middlewares');


const router = Router();

//getBooks route
router.get('/books', getBooksElastic);

//Most Recent Books route
router.get('/mostRecent', getRecentBooksElastic);

//Most Liked Books route
router.get('/mostLiked', getMostLikedBooksElastic);

//getGenres route
router.get('/genres', getGenresElastic);

//registration route
router.post("/registration", registerValidation, validationMiddleware, register);
router.post("/login", loginValidation, validationMiddleware, login);
router.get('/logout', logout)

//createBooks route
router.post('/create', userAuth, upload.single('cover_img') , createBooks)

//details route
router.get('/details/:book_id', getDetailsElastic)

//users route
router.get('/users', userAuth, getUsersElastic)

//interaction route
router.post('/interaction', userAuth, handleInteraction)

router.get('/getLikes', userAuth, isBookLikedByUserElastic)

//update books
router.put('/update', userAuth, upload.single('cover_img'), editBooks)

//delete books
router.delete('/delete', userAuth, deleteBook)

module.exports = router;
