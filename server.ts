import express from "express";
import { config } from "dotenv";
const app = express();
const cookieParser = require('cookie-parser')
const passport = require('passport')
const cors = require('cors')
const routes = require('./routes/router')


config()
const PORT = process.env.PORT
const CLIENT_URL: string | undefined = process.env.CLIENT_URL

//initialize middlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: CLIENT_URL, credentials: true }))
app.use(passport.initialize())

app.use('/api', routes)
app.use('/uploads', express.static('uploads'));

//app start
const appStart = () => {
    try {
      app.listen(PORT, () => {
        console.log(`The app is running at http://localhost:${PORT}`)

      })
    } catch (error: unknown) {
        if(error instanceof Error) console.error(error.message)
    }
  }

  appStart()
