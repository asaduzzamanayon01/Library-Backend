import { Request } from "express"
const { check } = require('express-validator')
const db = require('../models/index')
const { compare } = require('bcryptjs')

type req = {
    req: Request
}

//username
const username = check('username')
  .isLength({ min: 3, max: 40 })
  .withMessage('Password has to be between 3 and 40 characters.')

//password
const password = check('password')
  .isLength({ min: 6, max: 15 })
  .withMessage('Password has to be between 6 and 15 characters.')

//email
const email = check('email')
  .isEmail()
  .withMessage('Please provide a valid email.')

//check if email exists
const emailExists = check('email').custom(async (value: string) => {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [
    value,
  ])

  if (rows.length) {
    throw new Error('Email already exists.')
  }
})

//login validation
const loginFieldsCheck = check('email').custom(async (value: string, { req }: { req: Request & { user?: any } }) => {
    const user = await db.query('SELECT * from users WHERE email = $1', [value])

    if (!user.rows.length) {
      throw new Error('Email does not exists.')
    }

    const validPassword = await compare(req.body.password, user.rows[0].password)

    if (!validPassword) {
      throw new Error('Wrong password')
    }

    req.user = user.rows[0]
  })


module.exports = {
    registerValidation: [username, email, password, emailExists],
    loginValidation: [loginFieldsCheck],
}
