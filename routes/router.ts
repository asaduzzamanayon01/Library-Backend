import { Router } from "express";

const { getUsers, register, login, protectedRoute, getBooks, logout, getDetails, getGenre} = require("../controllers/auth");
const {registerValidation, loginValidation} = require('../validators/auth-validators');
import { validationMiddleware } from '../middelwares/validation-middleware';
const {userAuth} = require('../middelwares/passport-middlewares');


const router = Router();

//pagination route
router.get('/books/:offset/:limit/:genre', getBooks);
router.get("/get-users", getUsers);
router.post("/registration", registerValidation, validationMiddleware, register);
router.post("/login", loginValidation, validationMiddleware, login);
router.get('/protected', userAuth, protectedRoute)
router.get('/logout', userAuth, logout)

//details route
router.get('/details/:book_id', getDetails)

//interaction route

//search route

// genre route
// router.get('/genre/:genre', getGenre)

module.exports = router;
