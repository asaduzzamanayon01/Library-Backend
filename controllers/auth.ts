import { Request, Response } from "express"
import { config } from 'dotenv';
const db = require('../models/index')
const {hash} = require('bcryptjs')
const {sign} = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
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

// exports.getGenre = async (req: Request, res: Response) => {
//     try {
//         const response = await db.query("SELECT b.title, b.cover_img FROM book_genre bg LEFT JOIN books b ON bg.book_id = b.book_id LEFT JOIN genres g ON bg.genre_id = g.genre_id WHERE bg.genre_id = $1;", [req.params.genre])
//         return res.status(200).json({
//             success: true,
//             books: response.rows
//         })
//     } catch (error: unknown) {
//         if(error instanceof Error) console.error(error.message)
//     }
// }

// exports.getBooks = async (req: Request, res: Response) => {
//     const limit = parseInt(req.params.limit as string, 10) || 10;
//     const offset = parseInt(req.params.offset as string, 10) || 0;

//     try {
//         // Ensure offset is non-negative
//         const validOffset = Math.max(offset, 0);

//         // Query to get the books with the limit and offset
//         const booksResponse = await db.query(
//             "SELECT * FROM books ORDER BY book_id LIMIT $1 OFFSET $2",
//             [limit, validOffset]
//         );

//         // Query to get the total count of books
//         const countResponse = await db.query(
//             "SELECT COUNT(*) FROM books"
//         );
//         const totalBooks = parseInt(countResponse.rows[0].count, 10);

//         // Determine if there are more books to fetch
//         const hasMoreBooks = validOffset + limit < totalBooks;

//         // Send the books and the flag indicating if more books are available
//         return res.status(200).json({
//             books: booksResponse.rows,
//             hasMoreBooks
//         });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             return res.status(500).json({ error: error.message });
//         }
//         return res.status(500).json({ error: 'An unknown error occurred' });
//     }
// };

// exports.getBooks = async (req: Request, res: Response) => {
//     const limit = parseInt(req.params.limit as string, 10) || 10;
//     const offset = parseInt(req.params.offset as string, 10) || 0;
//     const genre = req.params.genre && req.params.genre !== 'undefined' ? req.params.genre : null; // Handle empty genre case

//     try {
//         // If genre is provided, fetch books by genre
//         if (genre) {
//             const genreQuery = `
//                 SELECT b.title, b.cover_img
//                 FROM book_genre bg
//                 LEFT JOIN books b ON bg.book_id = b.book_id
//                 LEFT JOIN genres g ON bg.genre_id = g.genre_id
//                 WHERE g.genre_id = $1
//                 LIMIT $2 OFFSET $3;
//             `;
//             const genreResponse = await db.query(genreQuery, [genre, limit, offset]);

//             const genreCountQuery = `
//                 SELECT COUNT(*)
//                 FROM book_genre bg
//                 LEFT JOIN genres g ON bg.genre_id = g.genre_id
//                 WHERE g.genre_name = $1;
//             `;
//             const genreCountResponse = await db.query(genreCountQuery, [genre]);
//             const totalBooksByGenre = parseInt(genreCountResponse.rows[0].count, 10);
//             const hasMoreBooks = offset + limit < totalBooksByGenre;

//             if (genreResponse.rows.length === 0) {
//                 return res.status(404).json({ success: false, message: 'No books found for the specified genre' });
//             }

//             const genreName = await db.query('SELECT genre_name FROM genres WHERE genre_id=$1',[genre])

//             return res.status(200).json({
//                 books: genreResponse.rows,
//                 hasMoreBooks,
//                 genre: genreName.rows[0].genre_name
//             });
//         } else {
//             // No genre, fetch all books with pagination
//             const validOffset = Math.max(offset, 0);

//             const booksQuery = "SELECT * FROM books ORDER BY book_id LIMIT $1 OFFSET $2";
//             const booksResponse = await db.query(booksQuery, [limit, validOffset]);

//             const countResponse = await db.query("SELECT COUNT(*) FROM books");
//             const totalBooks = parseInt(countResponse.rows[0].count, 10);
//             const hasMoreBooks = validOffset + limit < totalBooks;

//             return res.status(200).json({
//                 books: booksResponse.rows,
//                 hasMoreBooks,
//                 genre: 'All Books' // Send 'All Books' when no genre is provided
//             });
//         }
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             return res.status(500).json({ error: error.message });
//         }
//         return res.status(500).json({ error: 'An unknown error occurred' });
//     }
// };

exports.getBooks = async (req: Request, res: Response) => {
    const limit = parseInt(req.params.limit as string, 10) || 10;
    const offset = parseInt(req.params.offset as string, 10) || 0;
    const genreId = parseInt(req.params.genre as string, 10);

    try {
        if (genreId > 0) {
            // Fetch books by genre ID
            const genreQuery = `
                SELECT b.title, b.cover_img
                FROM book_genre bg
                LEFT JOIN books b ON bg.book_id = b.book_id
                WHERE bg.genre_id = $1
                LIMIT $2 OFFSET $3;
            `;
            const genreResponse = await db.query(genreQuery, [genreId, limit, offset]);

            const genreCountQuery = `
                SELECT COUNT(*)
                FROM book_genre bg
                WHERE bg.genre_id = $1;
            `;
            const genreCountResponse = await db.query(genreCountQuery, [genreId]);
            const totalBooksByGenre = parseInt(genreCountResponse.rows[0].count, 10);
            const hasMoreBooks = offset + limit < totalBooksByGenre;

            // Fetch genre name
            const genreNameResponse = await db.query('SELECT genre_name FROM genres WHERE genre_id=$1', [genreId]);
            const genreName = genreNameResponse.rows[0]?.genre_name || 'Unknown Genre';

            return res.status(200).json({
                id: uuidv4(),
                books: genreResponse.rows,
                hasMoreBooks,
                genre: genreName,
                genreId: genreId
            });
        } else {
            // No genre, fetch all books with pagination
            const validOffset = Math.max(offset, 0);

            const booksQuery = "SELECT * FROM books ORDER BY book_id LIMIT $1 OFFSET $2";
            const booksResponse = await db.query(booksQuery, [limit, validOffset]);

            const countResponse = await db.query("SELECT COUNT(*) FROM books");
            const totalBooks = parseInt(countResponse.rows[0].count, 10);
            const hasMoreBooks = validOffset + limit < totalBooks;

            return res.status(200).json({
                id: uuidv4(),
                books: booksResponse.rows,
                hasMoreBooks,
                genre: 'All Books',
                genreId: null
            });
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};



// exports.getBooks = async (req: Request, res: Response) => {
//     const { offset, limit, genre } = req.params;

//     try {
//         // Ensure limit and offset are non-negative
//         const validLimit = Math.max(parseInt(limit, 10), 0);
//         const validOffset = Math.max(parseInt(offset, 10), 0);

//         let booksResponse;
//         let countResponse;
//         let totalBooks;
//         let hasMoreBooks;

//         if (genre) {
//             // Query to get the books by genre with the limit and offset
//             booksResponse = await db.query(
//                 "SELECT b.title, b.cover_img FROM book_genre bg LEFT JOIN books b ON bg.book_id = b.book_id LEFT JOIN genres g ON bg.genre_id = g.genre_id WHERE bg.genre_id = $1 ORDER BY b.book_id LIMIT $2 OFFSET $3",
//                 [genre, validLimit, validOffset]
//             );

//             // Query to get the total count of books by genre
//             countResponse = await db.query(
//                 "SELECT COUNT(*) FROM book_genre bg LEFT JOIN books b ON bg.book_id = b.book_id LEFT JOIN genres g ON bg.genre_id = g.genre_id WHERE bg.genre_id = $1",
//                 [genre]
//             );
//         } else {
//             // Query to get the books with the limit and offset
//             booksResponse = await db.query(
//                 "SELECT * FROM books ORDER BY book_id LIMIT $1 OFFSET $2",
//                 [validLimit, validOffset]
//             );

//             // Query to get the total count of books
//             countResponse = await db.query(
//                 "SELECT COUNT(*) FROM books"
//             );
//         }

//         totalBooks = parseInt(countResponse.rows[0].count, 10);

//         // Determine if there are more books to fetch
//         hasMoreBooks = validOffset + validLimit < totalBooks;

//         // Send the books, the flag indicating if more books are available, and the genre
//         return res.status(200).json({
//             books: booksResponse.rows,
//             hasMoreBooks,
//             genre: genre || null
//         });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             console.error(error.message);
//             return res.status(500).json({ error: 'Internal Server Error' });
//         }
//         return res.status(500).json({ error: 'An unknown error occurred' });
//     }
// };


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
        const token = await sign(payload, SECRET, {expiresIn: '99999h'})
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
