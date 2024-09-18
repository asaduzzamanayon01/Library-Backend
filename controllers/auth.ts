import { Request, Response } from "express"
import { config } from 'dotenv';
const db = require('../models/index')
const {hash} = require('bcryptjs')
const {sign} = require('jsonwebtoken')
config()
const SECRET = process.env.SECRET

exports.getUsers = async (req: Request, res: Response)=>{
    try {
        const response = await db.query('SELECT user_id, username, email FROM users')
        return res.status(200).json({
            success: true,
            users: response.rows
        })
    } catch (error: unknown) {
        if(error instanceof Error) console.error(error.message)
    }
}
exports.getBooks = async (req: Request, res: Response)=>{
    try {
        const response = await db.query('SELECT * FROM books')
        return res.status(200).json({
            books: response.rows
        })
    } catch (error: unknown) {
        if(error instanceof Error) console.error(error.message)
    }
}

exports.getDetails = async (req: Request, res: Response) => {
    try {
        const book_id = parseInt(req.params.book_id, 10);
        if (isNaN(book_id)) {
            return res.status(400).json({ error: 'book_id parameter must be a number' });
        }

        const response = await db.query("SELECT * FROM books WHERE book_id = $1", [book_id]);
        console.log(response.rows);
        return res.status(200).json({
            books: response.rows
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

exports.register = async (req: Request, res: Response)=>{
    const {username, email, password} = req.body
    try {
        const hashedPassword = await hash(password, 10)
        const response = await db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [username, email, hashedPassword])
        console.log(response.rows)
        return res.status(201).json(
            {
                success: true,
                message: 'User created successfully'
            }
        )
    } catch (error: unknown) {
        if(error instanceof Error) return res.send(501).json({
            success: false,
            message: error.message
        })
    }
}

exports.login = async (req: Request & {user ?: any}, res: Response)=>{
    let user = req.user
    let payload = {
        id: user.user_id,
        username: user.username,
        email: user.email
    }
     try {
        const token = await sign(payload, SECRET, {expiresIn: '1h'})
        return res.status(200).cookie('jwt', token, {httpOnly: true}).json({
            success: true,
            message: 'User logged in successfully'
        })
    } catch (error: unknown) {
        if(error instanceof Error) return res.send(501).json({
            success: false,
            message: error.message
        })
    }
}

exports.protectedRoute = async (req: Request, res: Response) => {
    try {
      return res.status(200).json({
        info: 'protected info',
      })
    } catch (error: unknown) {
        if(error instanceof Error) console.log(error.message)
    }
  }

  exports.logout = async (req: Request, res: Response) => {
    try {
      return res.status(200).clearCookie('jwt', { httpOnly: true }).json({
        success: true,
        message: 'Logged out succefully',
      })
    } catch (error: unknown) {
        if(error instanceof Error) return res.send(500).json({
            success: false,
            message: error.message
        })
    }
  }
