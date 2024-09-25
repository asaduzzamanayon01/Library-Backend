import { Client } from '@elastic/elasticsearch';

import { upload } from '../multer_conf';
const client = new Client({ node: 'http://localhost:9200' });
import { Request, Response } from "express"
import { config } from 'dotenv';
const db = require('../models/index')
const {hash} = require('bcryptjs')
const {sign} = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid');
config()
const SECRET = process.env.SECRET

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        [key: string]: any;
    };
}

exports.getBooks = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const genreId = parseInt(req.query.genre as string, 10) || 0;
    const searchTitle = (req.query.search as string)?.toLowerCase() || '';

    try {
        // Fetch books by genre ID
        const genreQuery = `
            SELECT b.title, b.cover_img, b.book_id, b.user_id
            FROM book_genre bg
            LEFT JOIN books b ON bg.book_id = b.book_id
            WHERE bg.genre_id = $1 AND LOWER(b.title) LIKE $4
            ORDER BY b.created_at DESC -- Ensure that newer books appear first
            LIMIT $2 OFFSET $3;
        `;
        const genreResponse = await db.query(genreQuery, [genreId, limit, offset, `%${searchTitle}%`]);

        const genreCountQuery = `
            SELECT COUNT(*)
            FROM book_genre bg
            LEFT JOIN books b ON bg.book_id = b.book_id
            WHERE bg.genre_id = $1 AND LOWER(b.title) LIKE $2;
        `;
        const genreCountResponse = await db.query(genreCountQuery, [genreId, `%${searchTitle}%`]);
        const totalBooksByGenre = parseInt(genreCountResponse.rows[0].count, 10);
        const hasMoreBooks = offset + limit < totalBooksByGenre;

        return res.status(200).json({
            books: genreResponse.rows,
            hasMoreBooks,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};

// elastic search getBooks
// exports.getBooks = async (req: Request, res: Response) => {
//     const limit = parseInt(req.query.limit as string, 10) || 10;
//     const offset = parseInt(req.query.offset as string, 10) || 0;
//     const genreId = parseInt(req.query.genre as string, 10) || 0;
//     const searchTitle = (req.query.search as string)?.toLowerCase() || '';

//     try {
//         // Build Elasticsearch query
//         const query: any = {
//             bool: {
//                 must: [],
//                 filter: [],
//             },
//         };

//         if (searchTitle) {
//             query.bool.must.push({
//                 match: { title: searchTitle },
//             });
//         }

//         if (genreId) {
//             query.bool.filter.push({
//                 term: { genre_id: genreId },
//             });
//         }

//         // Perform search in Elasticsearch
//         const result = await client.search({
//             index: 'books',
//             from: offset,
//             size: limit,
//             body: {
//                 query,
//                 sort: [{ created_at: 'desc' }],
//             },
//         });

//         // Access hits and total safely
//         const books = result.hits.hits.map((hit: any) => hit._source);

//         // Check if total exists and handle possible types
//         const totalBooksByGenre = result.hits.total
//             ? typeof result.hits.total === 'number'
//                 ? result.hits.total
//                 : result.hits.total.value
//             : 0; // Fallback to 0 if undefined

//         const hasMoreBooks = offset + limit < totalBooksByGenre;

//         // You can fetch the genre name from your DB if needed
//         const genreName = genreId ? 'Some Genre' : 'Unknown Genre';

//         return res.status(200).json({
//             id: uuidv4(),
//             books,
//             hasMoreBooks,
//             genre: genreName,
//             genreId,
//         });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             return res.status(500).json({ error: error.message });
//         }
//         return res.status(500).json({ error: 'An unknown error occurred' });
//     }
// };

// exports.getBooks = async (req: Request, res: Response) => {
//     const limit = parseInt(req.query.limit as string, 10) || 10;
//     const offset = parseInt(req.query.offset as string, 10) || 0;
//     const genreId = parseInt(req.query.genre as string, 10) || 0;
//     const searchTitle = (req.query.search as string)?.toLowerCase() || '';

//     try {
//         // Build Elasticsearch query for books
//         const query: any = {
//             bool: {
//                 must: [],
//                 filter: [],
//             },
//         };

//         if (searchTitle) {
//             query.bool.must.push({
//                 match: { title: searchTitle },
//             });
//         }

//         if (genreId) {
//             query.bool.filter.push({
//                 term: { genre_id: genreId },
//             });
//         }

//         // Perform search in Elasticsearch for books
//         const result = await client.search({
//             index: 'books',
//             from: offset,
//             size: limit,
//             body: {
//                 query,
//                 sort: [{ created_at: 'desc' }],
//             },
//         });

//         // Access hits and total safely
//         const books = result.hits.hits.map((hit: any) => hit._source);

//         // Check if total exists and handle possible types
//         const totalBooksByGenre = result.hits.total
//             ? typeof result.hits.total === 'number'
//                 ? result.hits.total
//                 : result.hits.total.value
//             : 0; // Fallback to 0 if undefined

//         const hasMoreBooks = offset + limit < totalBooksByGenre;

//         // Fetch genre name from Elasticsearch
//         let genreName = 'Unknown Genre'; // Default genre name
//         if (genreId) {
//             const genreResult: ApiResponse = await client.search({
//                 index: 'genres',
//                 body: {
//                     query: {
//                         term: { genre_id: genreId },
//                     },
//                 },
//             });

//             if (genreResult.body.hits.hits.length > 0) {
//                 // Use type assertion to access genre name safely
//                 genreName = (genreResult.body.hits.hits[0]._source as { genre_name: string }).genre_name; // Get genre name from the first hit
//             }
//         }

//         return res.status(200).json({
//             id: uuidv4(),
//             books,
//             hasMoreBooks,
//             genre: genreName,
//             genreId,
//         });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             return res.status(500).json({ error: error.message });
//         }
//         return res.status(500).json({ error: 'An unknown error occurred' });
//     }
// };


exports.getRecentBooks = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        const recentBooksQuery = `
            SELECT b.title, b.cover_img, b.book_id, b.user_id, b.created_at
            FROM books b
            ORDER BY b.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const recentBooksResponse = await db.query(recentBooksQuery, [limit, offset]);

        const totalCountQuery = `
            SELECT COUNT(*) FROM books
        `;
        const totalCountResponse = await db.query(totalCountQuery);

        const totalBooks = parseInt(totalCountResponse.rows[0].count, 10);
        const hasMoreBooks = offset + limit < totalBooks;

        return res.status(200).json({
            books: recentBooksResponse.rows,
            hasMoreBooks,
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};

exports.getMostLikedBooks = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        const mostLikedBooksQuery = `
        SELECT b.title, b.cover_img, b.book_id,
       SUM(CASE WHEN i."like" = TRUE THEN 1 ELSE 0 END) as likes_count
        FROM books b
        LEFT JOIN interactions i ON b.book_id = i.book_id
GROUP BY b.book_id
ORDER BY likes_count DESC
LIMIT $1 OFFSET $2;
        `;
        const mostLikedBooksResponse = await db.query(mostLikedBooksQuery, [limit, offset]);

        const totalCountQuery = `
            SELECT COUNT(*) FROM books
        `;
        const totalCountResponse = await db.query(totalCountQuery);

        const totalBooks = parseInt(totalCountResponse.rows[0].count, 10);
        const hasMoreBooks = offset + limit < totalBooks;

        return res.status(200).json({
            books: mostLikedBooksResponse.rows,
            hasMoreBooks,
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};

exports.getGenres = async (req:Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        const genresQuery = `
            SELECT genre_id, genre_name
            FROM genres
            ORDER BY genre_id
            LIMIT $1 OFFSET $2;
        `;
        const genresResponse = await db.query(genresQuery, [limit, offset]);

        const countResponse = await db.query("SELECT COUNT(*) FROM genres");
        const totalGenres = parseInt(countResponse.rows[0].count, 10);
        const hasMoreGenres = offset + limit < totalGenres;

        return res.status(200).json({
            genres: genresResponse.rows,
            hasMoreGenres
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
}


//elastic getGenre
// exports.getGenres = async (req: Request, res: Response) => {
//     const limit = parseInt(req.query.limit as string, 10) || 5;
//     const offset = parseInt(req.query.offset as string, 10) || 0;

//     try {
//         // Elasticsearch query to fetch genres with pagination
//         const searchResponse = await client.search({
//             index: "genres", // Assuming the genres data is indexed under 'genres'
//             from: offset, // Pagination: starting point (like OFFSET in SQL)
//             size: limit,  // Number of items to return (like LIMIT in SQL)
//         });

//         // Handle both number and object types for `total`
//         let totalGenres;
//         if (typeof searchResponse.hits.total === 'number') {
//             totalGenres = searchResponse.hits.total; // If total is a number, use it directly
//         } else {
//             totalGenres = searchResponse.hits.total?.value || 0; // If total is an object, get the value
//         }

//         const hasMoreGenres = offset + limit < totalGenres;

//         // Extract the genres from the search result
//         const genres = searchResponse.hits.hits.map((hit: any) => ({
//             genre_id: hit._id,
//             genre_name: hit._source.genre_name,
//         }));

//         return res.status(200).json({
//             genres,
//             hasMoreGenres
//         });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             return res.status(500).json({ error: error.message });
//         }
//         return res.status(500).json({ error: "An unknown error occurred" });
//     }
// };

exports.getDetails = async (req: Request, res: Response) => {
    try {
        const book_id = parseInt(req.params.book_id, 10);
        if (isNaN(book_id)) {
            return res.status(400).json({ error: 'book_id parameter must be a number' });
        }

        const response = await db.query("SELECT * FROM books WHERE book_id = $1", [book_id]);
        const likeResponse = await db.query("SELECT COUNT(*) FROM interactions WHERE book_id = $1 AND \"like\" = TRUE", [book_id]);
        const dislikeResponse = await db.query("SELECT COUNT(*) FROM interactions WHERE book_id = $1 AND \"like\" = FALSE", [book_id]);
        return res.status(200).json({
            books: response.rows,
            likes: parseInt(likeResponse.rows[0].count, 10),
            dislikes: parseInt(dislikeResponse.rows[0].count, 10)
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

exports.handleInteraction =    async (req: Request, res: Response) => {
    const { book_id, like } = req.body;

  const userId = (req as AuthenticatedRequest).user?.id;

  if (!userId) {
      return res.status(401).json({
          success: false,
          message: 'Unauthorized'
      });
  }
    if (typeof userId !== 'number' || typeof book_id !== 'number' || typeof like !== 'boolean') {
      return res.status(400).json({ error: 'Invalid input data' });
    }

  try {
        // Check if an interaction already exists
        const checkQuery = 'SELECT * FROM interactions WHERE user_id = $1 AND book_id = $2';
        const checkResult = await db.query(checkQuery, [userId, book_id]);

        let result;
        if (checkResult.rows.length > 0) {
          // Update existing interaction
          const updateQuery = 'UPDATE interactions SET "like" = $1, created_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND book_id = $3 RETURNING *';
          result = await db.query(updateQuery, [like, userId, book_id]);
        } else {
          // Insert new interaction
          const insertQuery = 'INSERT INTO interactions (user_id, book_id, "like") VALUES ($1, $2, $3) RETURNING *';
          result = await db.query(insertQuery, [userId, book_id, like]);
        }

        res.status(200).json(result.rows[0]);
      }
     catch (error) {
      console.error('Error handling interaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
}

exports.register = async (req: Request, res: Response)=>{
    const {username, email, password} = req.body
    try {
        const hashedPassword = await hash(password, 10)
        const response = await db.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *', [username, email, hashedPassword])
        const newUser = response.rows[0];
        const payload =
        {
            id: newUser.user_id,
            username: newUser.username,
            email: newUser.email
        };
        const token = await sign(payload, SECRET, { expiresIn: '99999h' });
        return res.status(201).cookie('jwt', token, {httpOnly: true, sameSite: 'strict'}).json(
            {
                success: true,
                message: 'User registered and logged in successfully'
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
        return res.status(200).cookie('jwt', token, {httpOnly: true, sameSite: 'strict'}).json({
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

exports.createBooks = async (req: Request, res: Response) => {
    const {
        title, rating, language, pages, publish_date,
        num_ratings, price, author, description_text, publisher, genres
    } = req.body;

    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    try {
        const coverImgPath = req.file ? req.file.path : null;
        const response = await db.query(
            'INSERT INTO books (title, rating, language, pages, publish_date, num_ratings, cover_img, price, author, description_text, publisher, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [title, rating, language, pages, publish_date, num_ratings, coverImgPath, price, author, description_text, publisher, userId]
        );

        const newBook = response.rows[0];
        const bookId = newBook.book_id;

        // Insert selected genres into book_genre table
        const genreIds = JSON.parse(genres);
        if (Array.isArray(genreIds) && genreIds.length > 0) {
            const genreInsertPromises = genreIds.map((genreId: number) => {
                return db.query(
                    'INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2)',
                    [bookId, genreId]
                );
            });
            await Promise.all(genreInsertPromises);
        }

        return res.status(201).json({
            success: true,
            message: 'Book created successfully',
            book: newBook,
        });
    } catch (error: unknown) {
        console.error('Error in createBooks:', error);
        if (error instanceof Error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'An unknown error occurred'
        });
    }
};

exports.getUsers = async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    // Pagination query parameters
    const limit = parseInt(req.query.limit as string) || 6; // Default limit is 6
    const offset = parseInt(req.query.offset as string) || 0; // Default offset is 0

    try {
        // Query to get added books with pagination
        const add_response = await db.query(
            `SELECT u.user_id, b.book_id, b.title, b.cover_img, b.author, b.language
             FROM users u
             LEFT JOIN books b ON u.user_id = b.user_id
             WHERE u.user_id = $1
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Query to get liked books with pagination
        const query = `
            SELECT
                u.user_id,
                b.book_id,
                b.title,
                b.cover_img,
                b.author,
                b.language
            FROM
                users u
            JOIN
                interactions i ON u.user_id = i.user_id
            JOIN
                books b ON i.book_id = b.book_id
            WHERE
                u.user_id = $1 AND i.like = true
            ORDER BY
                i.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const liked_response = await db.query(query, [userId, limit, offset]);

        // Query to get total count of added and liked books (optional but useful for frontend pagination)
        const total_added_books = await db.query(
            'SELECT COUNT(*) FROM books WHERE user_id = $1',
            [userId]
        );
        const total_liked_books = await db.query(
            `SELECT COUNT(*)
            FROM interactions i
            JOIN books b ON i.book_id = b.book_id
            WHERE i.user_id = $1 AND i."like" = TRUE`,
            [userId]
        );

        const username = await db.query('SELECT username FROM users WHERE user_id = $1', [userId]);

        return res.status(200).json({
            success: true,
            added_books: add_response.rows,
            liked_books: liked_response.rows,
            total_added_books: parseInt(total_added_books.rows[0].count, 10),
            total_liked_books: parseInt(total_liked_books.rows[0].count, 10)
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'An unknown error occurred'
        });
    }
};

exports.isBookLikedByUser = async (req: Request, res: Response) => {
    const { book_id } = req.query;

    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    if (!book_id) {
        return res.status(400).json({
            success: false,
            message: 'Book ID is required'
        });
    }

    try {
        const query = 'SELECT "like" FROM interactions WHERE user_id = $1 AND book_id = $2 AND "like" = TRUE';
        const result = await db.query(query, [userId, book_id]);

        const isLiked = result.rows.length > 0;

        return res.status(200).json({
            isLiked: isLiked
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'An unknown error occurred'
        });
    }
};
