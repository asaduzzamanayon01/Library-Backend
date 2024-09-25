const passport = require("passport");
const { Strategy, ExtractJwt } = require("passport-jwt");
import { config } from "dotenv";
const db = require("../models/index");
import { Request, Response, NextFunction } from "express";

config();
const SECRET = process.env.SECRET;

const cookieExtractor = function (req: Request, res: Response, next: NextFunction) {
    let token = null;
    if (req && req.cookies) token = req.cookies["jwt"];
    return token;
};

const opts = {
    secretOrKey: SECRET,
    jwtFromRequest: cookieExtractor,
};

passport.use(
    new Strategy(opts, async ({ id }: any, done: any) => {
        try {
            const { rows } = await db.query(
                "SELECT user_id, email FROM users WHERE user_id = $1",
                [id]
            );

            if (!rows.length) {
                throw new Error("401 not authorized");
            }

            let user = { id: rows[0].user_id, email: rows[0].email };

            return await done(null, user);
        } catch (error) {
            // console.log(error.message);
            done(null, false);
        }
    })
);

exports.userAuth = passport.authenticate('jwt', { session: false })
