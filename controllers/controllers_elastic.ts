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

interface TermsBucket {
    key: string;
    likes_count: {
        value: number;
    };
}

exports.getBooksElastic = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const genreId = parseInt(req.query.genre as string, 10) || 0;
    const searchTitle = (req.query.search as string)?.toLowerCase() || '';

    try {
        let bookIds: number[] = [];

        // If genreId is provided, get book_ids from book_genre index
        if (genreId) {
            const bookGenreResponse = await client.search({
                index: 'book_genre',
                size: 10000,
                query: {
                    term: { genre_id: genreId }
                },
            });

            bookIds = bookGenreResponse.hits.hits.map((hit: any) => hit._source.book_id);

            if (bookIds.length === 0) {
                return res.status(200).json({ books: [], hasMoreBooks: false });
            }
        }

        // Query the books index
        const bookQuery: any = {
            index: 'books',
            size: limit,
            from: offset,
            query: {
                bool: {
                    must: []
                }
            },
            sort: [
                { created_at: { order: 'desc' } }
            ],
        };

        if (searchTitle) {
            bookQuery.query.bool.must.push({
                multi_match: {
                    query: searchTitle,
                    fields: ['title^3', 'description'],
                    fuzziness: 'AUTO',
                    operator: 'and'
                }
            });
        }

        if (bookIds.length > 0) {
            bookQuery.query.bool.filter = [
                { terms: { book_id: bookIds } }
            ];
        }

        const bookResponse = await client.search(bookQuery);

        const totalBooksCount = typeof bookResponse.hits.total === 'number'
            ? bookResponse.hits.total
            : bookResponse.hits.total?.value || 0;

        const books = bookResponse.hits.hits.map((hit: any) => ({
            book_id: hit._source.book_id,
            title: hit._source.title,
            cover_img: hit._source.cover_img,
            user_id: hit._source.user_id,
        }));

        const hasMoreBooks = offset + limit < totalBooksCount;

        return res.status(200).json({
            books,
            hasMoreBooks,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};

exports.getGenresElastic = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        // Elasticsearch query to fetch genres with pagination
        const searchResponse = await client.search({
            index: "genres", // Assuming the genres data is indexed under 'genres'
            from: offset, // Pagination: starting point (like OFFSET in SQL)
            size: limit,  // Number of items to return (like LIMIT in SQL)
        });

        // Handle both number and object types for `total`
        let totalGenres;
        if (typeof searchResponse.hits.total === 'number') {
            totalGenres = searchResponse.hits.total; // If total is a number, use it directly
        } else {
            totalGenres = searchResponse.hits.total?.value || 0; // If total is an object, get the value
        }

        const hasMoreGenres = offset + limit < totalGenres;

        // Extract the genres from the search result
        const genres = searchResponse.hits.hits.map((hit: any) => ({
            genre_id: parseInt(hit._source.genre_id, 10), // Ensure genre_id is returned as an integer
            genre_name: hit._source.genre_name,
        }));

        return res.status(200).json({
            genres,
            hasMoreGenres
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: "An unknown error occurred" });
    }
};

exports.getRecentBooksElastic = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        const recentBooksQuery = {
            index: 'books',
            size: limit,
            from: offset,
            sort: [
                { created_at: { order: 'desc' } },
            ],
        };

        const recentBooksResponse = await client.search(recentBooksQuery);

        const totalBooksCount = typeof recentBooksResponse.hits.total === 'number'
            ? recentBooksResponse.hits.total
            : recentBooksResponse.hits.total?.value || 0;

        const books = recentBooksResponse.hits.hits.map((hit: any) => ({
            book_id: hit._source.book_id,
            title: hit._source.title,
            cover_img: hit._source.cover_img,
            user_id: hit._source.user_id,
            created_at: hit._source.created_at,
        }));

        const hasMoreBooks = offset + limit < totalBooksCount;

        return res.status(200).json({
            books,
            hasMoreBooks,
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};

exports.getMostLikedBooksElastic = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
        // Step 1: Aggregate likes from interactions index
        const interactionsResponse = await client.search({
            index: 'interactions', // Assuming interactions index exists
            size: 0, // We don't need the actual documents, just the aggregation
            body: {
                query: {
                    term: {
                        like: true // Filter for where "like" is true
                    }
                },
                aggs: {
                    books_with_likes: {
                        terms: {
                            field: 'book_id', // Group by book_id
                            size: limit + offset, // Get enough data for pagination
                            order: {
                                likes_count: 'desc' // Order by likes count
                            }
                        },
                        aggs: {
                            likes_count: {
                                value_count: {
                                    field: 'like' // Count how many likes per book
                                }
                            }
                        }
                    }
                }
            }
        });

        // Typecast the aggregation result to the expected terms aggregation structure
        const booksWithLikesAgg = interactionsResponse.aggregations?.books_with_likes as { buckets: TermsBucket[] };

        // Step 2: Check if buckets exist
        if (!booksWithLikesAgg?.buckets) {
            return res.status(500).json({ error: 'Failed to retrieve likes aggregation' });
        }

        // Step 3: Extract the most liked book IDs
        const bookBuckets = booksWithLikesAgg.buckets;
        const bookIds = bookBuckets.slice(offset, offset + limit).map((bucket) => bucket.key);

        // Step 4: Fetch book details from the books index using book IDs
        const booksResponse = await client.mget({
            index: 'books', // Assuming your books index is called 'books'
            body: {
                ids: bookIds // Fetch books with the selected book IDs
            }
        });

        const books = booksResponse.docs.map((doc: any, index: number) => ({
            book_id: doc._id,
            title: doc._source.title, // Assuming title field exists
            cover_img: doc._source.cover_img, // Assuming cover_img field exists
            likes_count: bookBuckets[index].likes_count.value, // Get the corresponding like count from the aggregation
        }));

        // Step 5: Get total number of books
        const totalBooksResponse = await client.count({
            index: 'books',
        });

        const totalBooks = totalBooksResponse.count;
        const hasMoreBooks = offset + limit < totalBooks;

        return res.status(200).json({
            books,
            hasMoreBooks,
        });
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred' });
    }
};


exports.getDetailsElastic = async (req: Request, res: Response) => {
    try {
        // Step 1: Validate book_id from request params
        const book_id = parseInt(req.params.book_id, 10);
        if (isNaN(book_id)) {
            return res.status(400).json({ error: 'book_id parameter must be a number' });
        }

        // Step 2: Fetch book details from the books index
        const bookResponse = await client.get({
            index: 'books', // Assuming 'books' is the index name
            id: book_id.toString(), // Elasticsearch expects an ID as a string
        });

        // Check if the book exists
        if (!bookResponse.found) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Step 3: Fetch likes count from the interactions index
        const likeResponse = await client.count({
            index: 'interactions', // Assuming 'interactions' is the index name
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { book_id } }, // Filter by book_id
                            { term: { like: true } } // Only count likes
                        ]
                    }
                }
            }
        });

        // Step 4: Fetch dislikes count from the interactions index
        const dislikeResponse = await client.count({
            index: 'interactions', // Assuming 'interactions' is the index name
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { book_id } }, // Filter by book_id
                            { term: { like: false } } // Only count dislikes
                        ]
                    }
                }
            }
        });

        // Step 5: Return the book details along with like/dislike counts
        return res.status(200).json({
            book: bookResponse._source, // Book details from Elasticsearch
            likes: likeResponse.count, // Likes count
            dislikes: dislikeResponse.count, // Dislikes count
        });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error.message);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

exports.getUsersElastic = async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    console.log('Fetching books for User ID:', userId);

    const limit = parseInt(req.query.limit as string) || 15; // Pagination limit
    const offset = parseInt(req.query.offset as string) || 0; // Pagination offset

    try {
        // Query to get added books by user with pagination
        const addedBooksResponse = await client.search({
            index: 'books',
            size: limit, // Add pagination limit here
            from: offset, // Add pagination offset here
            query: {
                term: { user_id: userId }
            },
            sort: [
                { created_at: { order: 'desc' } } // Sort by created_at in descending order (latest first)
            ]
        });

        // Logging the response for debugging purposes
        console.log('Added books response from Elasticsearch:', JSON.stringify(addedBooksResponse, null, 2));

        const addedBooks = addedBooksResponse.hits.hits
            .filter((hit: any) => hit._source && hit._source.title) // Ensure title is present
            .map((hit: any) => ({
                book_id: hit._source.book_id,
                user_id: hit._source.user_id,
                title: hit._source.title,
                cover_img: hit._source.cover_img,
                author: hit._source.author,
                language: hit._source.language,
            }));

        const totalAddedBooksCount = typeof addedBooksResponse.hits.total === 'number'
            ? addedBooksResponse.hits.total
            : addedBooksResponse.hits.total?.value || 0;

        console.log('Total added books:', totalAddedBooksCount);

        // Query to get liked books with pagination
        const likedBooksResponse = await client.search({
            index: 'interactions',
            size: limit,
            from: offset,
            query: {
                bool: {
                    must: [
                        { term: { user_id: userId } },
                        { term: { like: true } }
                    ]
                }
            },
            sort: [
                { created_at: { order: 'desc' } }
            ]
        });

        const likedBookIds = likedBooksResponse.hits.hits
            .filter((hit: any) => hit._source && hit._source.book_id)
            .map((hit: any) => hit._source.book_id);

        console.log('Liked book IDs:', likedBookIds);

        // Fetch full details of liked books by their IDs
        const likedBooksDetailsResponse = await client.mget({
            index: 'books',
            body: {
                ids: likedBookIds
            }
        });

        const likedBooks = likedBooksDetailsResponse.docs
            .filter((doc: any) => doc.found && doc._source && doc._source.title)
            .map((doc: any) => ({
                book_id: doc._id,
                user_id: doc._source.user_id,
                title: doc._source.title,
                cover_img: doc._source.cover_img,
                author: doc._source.author,
                language: doc._source.language,
            }));

        const totalLikedBooksCount = typeof likedBooksResponse.hits.total === 'number'
            ? likedBooksResponse.hits.total
            : likedBooksResponse.hits.total?.value || 0;

        console.log('Total liked books:', totalLikedBooksCount);

        // Return results
        return res.status(200).json({
            success: true,
            added_books: addedBooks,
            liked_books: likedBooks,
            total_added_books: totalAddedBooksCount,
            total_liked_books: totalLikedBooksCount
        });
    } catch (error: unknown) {
        console.error('Error in getUsersElastic:', error);

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

exports.isBookLikedByUserElastic = async (req: Request, res: Response) => {
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
        const likeResponse = await client.search({
            index: 'interactions',
            size: 1,
            query: {
                bool: {
                    must: [
                        { term: { user_id: userId } },
                        { term: { book_id: book_id } },
                        { term: { like: true } }
                    ]
                }
            }
        });

        const totalLikes = typeof likeResponse.hits.total === 'number'
            ? likeResponse.hits.total
            : likeResponse.hits.total?.value || 0;

        const isLiked = totalLikes > 0;

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

