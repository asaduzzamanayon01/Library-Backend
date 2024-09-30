import { Client } from '@elastic/elasticsearch';
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

interface BookElastic {
    book_id: number;
    user_id: number;
    title: string;
    language: string;
    pages: number;
    publish_date: string;
    cover_img: string;
    price: number;
    author: string;
    description_text: string;
    publisher: string;
    created_at: string; // Adjust the type as necessary for your timestamp
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
        const interaction = result.rows[0];
        // Update or insert into Elasticsearch
        await client.index({
                    index: 'interactions',
                    id: `${interaction.user_id}-${interaction.book_id}`,
                    body: {
                        interaction_id: interaction.interaction_id,
                        user_id: interaction.user_id,
                        book_id: interaction.book_id,
                        like: interaction.like,
                        created_at: interaction.created_at
                    }
                });
        res.status(200).json(interaction);
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

                // Insert user into Elasticsearch
                await client.index({
                    index: 'users',
                    id: newUser.user_id.toString(),
                    body: {
                        user_id: newUser.user_id,
                        username: newUser.username,
                        email: newUser.email,
                        password: newUser.password,
                        created_at: newUser.created_at
                    }
                });
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

// exports.createBooks = async (req: Request, res: Response) => {
//     const {
//         title, language, pages, publish_date, price, author, description_text, publisher, genres
//     } = req.body;

//     const userId = (req as AuthenticatedRequest).user?.id;

//     if (!userId) {
//         return res.status(401).json({
//             success: false,
//             message: 'Unauthorized'
//         });
//     }

//     try {
//         const coverImgPath = req.file ? req.file.path : null;
//         const response = await db.query(
//             'INSERT INTO books (title, language, pages, publish_date, cover_img, price, author, description_text, publisher, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
//             [title, language, pages, publish_date, coverImgPath, price, author, description_text, publisher, userId]
//         );

//         const newBook = response.rows[0];
//         const bookId = newBook.book_id;

//         // Insert selected genres into book_genre table
//         const genreIds = JSON.parse(genres);
//         if (Array.isArray(genreIds) && genreIds.length > 0) {
//             const genreInsertPromises = genreIds.map((genreId: number) => {
//                 return db.query(
//                     'INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2)',
//                     [bookId, genreId]
//                 );
//             });
//             await Promise.all(genreInsertPromises);
//         }

//         // Insert book into Elasticsearch books index
//         await client.index({
//             index: 'books',
//             id: bookId.toString(),
//             body: {
//                 book_id: bookId,
//                 title: newBook.title,
//                 language: newBook.language,
//                 pages: newBook.pages,
//                 publish_date: newBook.publish_date,
//                 cover_img: newBook.cover_img,
//                 price: newBook.price,
//                 author: newBook.author,
//                 description_text: newBook.description_text,
//                 publisher: newBook.publisher,
//                 user_id: newBook.user_id,
//                 created_at: newBook.created_at,
//             }
//         });

//     // Insert book_genre into Elasticsearch book_genre index
//     // if (Array.isArray(genreIds) && genreIds.length > 0) {
//     //     const bookGenreIndexPromises = genreIds.map((genreId: number) => {
//     //         return client.index({
//     //             index: 'book_genre',
//     //             id: `${bookId}-${genreId}`,
//     //             body: {
//     //                 book_id: bookId,
//     //                 genre_id: genreId
//     //             }
//     //         });
//     //     });
//     //     await Promise.all(bookGenreIndexPromises);
//     // }
//     if (Array.isArray(genreIds) && genreIds.length > 0) {
//         const bulkBody = genreIds.flatMap(genreId => [
//             { index: { _index: 'book_genre', _id: `${bookId}-${genreId}` } },
//             { book_id: bookId, genre_id: genreId }
//         ]);
//         const bulkResponse = await client.bulk({ body: bulkBody });
//         if (bulkResponse.errors) {
//             console.error('Bulk insert errors:', bulkResponse.items);
//             throw new Error('Failed to insert all genres into Elasticsearch');
//         }
//     }


//         return res.status(201).json({
//             success: true,
//             message: 'Book created successfully',
//             book: newBook,
//         });
//     } catch (error: unknown) {
//         console.error('Error in createBooks:', error);
//         if (error instanceof Error) {
//             return res.status(500).json({
//                 success: false,
//                 message: error.message
//             });
//         }
//         return res.status(500).json({
//             success: false,
//             message: 'An unknown error occurred'
//         });
//     }
// };


exports.createBooks = async (req: Request, res: Response) => {
    const {
        title, language, pages, publish_date, price, author, description_text, publisher, genres
    } = req.body;

    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    try {
        console.log('Starting book creation process');
        const coverImgPath = req.file ? req.file.path : null;
        const response = await db.query(
            'INSERT INTO books (title, language, pages, publish_date, cover_img, price, author, description_text, publisher, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [title, language, pages, publish_date, coverImgPath, price, author, description_text, publisher, userId]
        );

        const newBook = response.rows[0];
        const bookId = newBook.book_id;
        console.log(`Book inserted into PostgreSQL with ID: ${bookId}`);

        // Insert selected genres into book_genre table
        const genreIds = JSON.parse(genres);
        console.log(`Parsed genre IDs: ${JSON.stringify(genreIds)}`);

        if (Array.isArray(genreIds) && genreIds.length > 0) {
            const genreInsertPromises = genreIds.map((genreId: number) => {
                return db.query(
                    'INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2)',
                    [bookId, genreId]
                ).then(() => console.log(`Genre ${genreId} inserted into PostgreSQL for book ${bookId}`))

                .catch((err: Error) => console.error(`Error inserting genre ${genreId} into PostgreSQL:`, err));
            });
            await Promise.all(genreInsertPromises);
        }

        // Insert book into Elasticsearch books index
        console.log('Inserting book into Elasticsearch');
        await client.index({
            index: 'books',
            id: bookId.toString(),
            body: {
                book_id: bookId,
                title: newBook.title,
                language: newBook.language,
                pages: newBook.pages,
                publish_date: newBook.publish_date,
                cover_img: newBook.cover_img,
                price: newBook.price,
                author: newBook.author,
                description_text: newBook.description_text,
                publisher: newBook.publisher,
                user_id: newBook.user_id,
                created_at: newBook.created_at,
            }
        });
        console.log(`Book inserted into Elasticsearch with ID: ${bookId}`);

        // Insert book_genre into Elasticsearch book_genre index
        console.log('Inserting book_genre relations into Elasticsearch');
        if (Array.isArray(genreIds) && genreIds.length > 0) {
            const bookGenreIndexPromises = genreIds.map((genreId: number) => {
                return client.index({
                    index: 'book_genre',
                    id: `${bookId}-${genreId}`,
                    body: {
                        book_id: bookId,
                        genre_id: genreId
                    }
                }).then(() => console.log(`Genre ${genreId} indexed in Elasticsearch for book ${bookId}`))
                  .catch(err => {
                      console.error(`Failed to index genre ${genreId} for book ${bookId} in Elasticsearch:`, err);
                      throw err;
                  });
            });

            try {
                await Promise.all(bookGenreIndexPromises);
                console.log('All book_genre relations inserted into Elasticsearch');
            } catch (error) {
                console.error('Error during book_genre Elasticsearch insertion:', error);
                // Consider how to handle partial failures here
            }
        }

        console.log('Book creation process completed successfully');
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

exports.editBooks = async (req: Request, res: Response) => {
    const { title, language, pages, publish_date, price, author, description_text, publisher, genres } = req.body;
    const bookId = parseInt(req.query.book_id as string, 10) || 0;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    console.log(`Editing book with ID: ${bookId} for user ID: ${userId}`);

    try {
        // Check if the book exists and belongs to the user
        const checkQuery = 'SELECT * FROM books WHERE book_id = $1 AND user_id = $2';
        const checkResult = await db.query(checkQuery, [bookId, userId]);

        if (checkResult.rows.length === 0) {
            console.log(`Book not found or does not belong to user. Book ID: ${bookId}, User ID: ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'Book not found or you do not have permission to edit this book'
            });
        }

        // Build the update query dynamically based on provided fields
        const updateFields = [
            title, language, pages, publish_date, price, author, description_text, publisher, bookId, userId
        ];
        let updateQuery = `
            UPDATE books
            SET title = $1, language = $2, pages = $3, publish_date = $4, price = $5, author = $6, description_text = $7, publisher = $8
            WHERE book_id = $9 AND user_id = $10
            RETURNING *
        `;

        const updateResponse = await db.query(updateQuery, updateFields);
        const updatedBook = updateResponse.rows[0];

        // Update genres in book_genre table if genres field is provided
        if (genres) {
            let genreIds = [];
            try {
                genreIds = JSON.parse(genres);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: `"${genres}" is not valid JSON`
                });
            }

            if (Array.isArray(genreIds) && genreIds.length > 0) {
                // Delete existing genres
                await db.query('DELETE FROM book_genre WHERE book_id = $1', [bookId]);

                // Insert new genres
                const genreInsertPromises = genreIds.map((genreId: number) => {
                    return db.query('INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2)', [bookId, genreId]);
                });
                await Promise.all(genreInsertPromises);
            }
        }

        // Check current values in Elasticsearch before updating
        const esCheck = await client.get({
            index: 'books',
            id: updatedBook.book_id.toString(),
        });


// Type assertion to inform TypeScript about the structure
const currentBook: BookElastic = esCheck._source as BookElastic;
        console.log('Current book in Elasticsearch before update:', currentBook);

        // Prepare the fields to update in Elasticsearch
        const updateBody: Partial<BookElastic> = {};
        if (bookId && bookId !== currentBook.book_id) updateBody.book_id = bookId;
        if (userId && userId !== currentBook.user_id) updateBody.book_id = userId;
        if (title && title !== currentBook.title) updateBody.title = title;
        if (language && language !== currentBook.language) updateBody.language = language;
        if (pages && pages !== currentBook.pages) updateBody.pages = pages;
        if (publish_date && publish_date !== currentBook.publish_date) updateBody.publish_date = publish_date;
        if (price && price !== currentBook.price) updateBody.price = price;
        if (author && author !== currentBook.author) updateBody.author = author;
        if (description_text && description_text !== currentBook.description_text) updateBody.description_text = description_text;
        if (publisher && publisher !== currentBook.publisher) updateBody.publisher = publisher;

        // Update book in Elasticsearch using Update API only if there are changes
        if (Object.keys(updateBody).length > 0) {
            try {
                const esResponse = await client.update({
                    index: 'books',
                    id: updatedBook.book_id.toString(),
                    body: {
                        doc: updateBody,
                    },
                    refresh: true  // Ensure the index is refreshed immediately
                });

                // Log Elasticsearch response
                console.log('Elasticsearch update response:', esResponse);
            } catch (elasticsearchError) {
                console.error('Error updating Elasticsearch:', elasticsearchError);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating Elasticsearch'
                });
            }
        } else {
            console.log('No updates required for Elasticsearch document');
        }

        return res.status(200).json({
            success: true,
            message: 'Book updated successfully',
            book: updatedBook
        });
    } catch (error: unknown) {
        console.error('Error in editBooks:', error);
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

exports.deleteBook = async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    const bookId = Number(req.query.bookId); // Using req.query to get bookId

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    try {
        // Fetch the book to check if it exists and belongs to the user
        const bookResponse = await client.get<{ _source: BookElastic }>({
            index: 'books',
            id: bookId.toString() // Ensure bookId is a string as Elasticsearch IDs are strings
        });

        // Check if the book was found and extract _source safely
        if (!bookResponse.found || !bookResponse._source) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        // Use type assertion to tell TypeScript that _source is BookElastic
        const book: BookElastic = bookResponse._source as unknown as BookElastic;

        // Check if the book belongs to the user
        if (book.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to delete this book'
            });
        }

        // Delete the book from Elasticsearch
        await client.delete({
            index: 'books',
            id: bookId.toString() // Ensure bookId is a string
        });

        console.log(`Book with ID ${bookId} deleted from books index`);

        // Delete associated interactions from Elasticsearch
        const interactionResponse = await client.search({
            index: 'interactions',
            query: {
                term: { book_id: bookId }
            }
        });

        const interactionIds = interactionResponse.hits.hits.map((hit: any) => hit._id);

        for (const interactionId of interactionIds) {
            await client.delete({
                index: 'interactions',
                id: interactionId
            });
        }

        console.log(`Interactions for book ID ${bookId} deleted`);

        // Delete book from book_genre index
        const bookGenreResponse = await client.search({
            index: 'book_genre',
            query: {
                term: { book_id: bookId }
            }
        });

        const bookGenreIds = bookGenreResponse.hits.hits.map((hit: any) => hit._id);

        for (const bookGenreId of bookGenreIds) {
            await client.delete({
                index: 'book_genre',
                id: bookGenreId
            });
        }

        console.log(`Book-genre relations for book ID ${bookId} deleted`);

        return res.status(200).json({
            success: true,
            message: `Book with ID ${bookId} and all related data deleted`
        });
    } catch (error: unknown) {
        console.error('Error in deleteBook:', error);

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
