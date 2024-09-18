const fs = require("fs");
const { Client } = require("pg");

// PostgreSQL client configuration
const client = new Client({
    user: "ayon",
    host: "localhost",
    database: "library_app",
    password: "admin",
    port: 5433,
});

async function populateBooksGenres() {
    try {
        await client.connect();
        const data = JSON.parse(
            fs.readFileSync("../others/books.json", "utf-8")
        );
        const first100Books = data.slice(0, 100);
        for (const book of first100Books) {
            const bookTitle = book.title;
            const genres = JSON.parse(book.genre.replace(/'/g, '"')); // Replace single quotes with double quotes to parse the array

            // Get book_id from books table
            const bookResult = await client.query(
                "SELECT book_id FROM books WHERE title = $1",
                [bookTitle]
            );

            if (bookResult.rows.length === 0) {
                console.error(`No book found with title: ${bookTitle}`);
                continue; // Skip to the next book
            }

            const bookId = bookResult.rows[0].book_id;

            for (const genre of genres) {
                // Get genre_id from genres table
                const genreResult = await client.query(
                    "SELECT genre_id FROM genres WHERE genre_name = $1",
                    [genre.trim()]
                );

                if (genreResult.rows.length === 0) {
                    console.error(`No genre found with name: ${genre.trim()}`);
                    continue; // Skip to the next genre
                }

                const genreId = genreResult.rows[0].genre_id;

                // Ensure both bookId and genreId are not null
                if (bookId && genreId) {
                    // Insert into books_genre table
                    await client.query(
                        "INSERT INTO book_genre (book_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        [bookId, genreId]
                    );
                } else {
                    console.error(
                        `Invalid bookId or genreId for book: ${bookTitle}, genre: ${genre.trim()}`
                    );
                }
            }
        }
        console.log("Books and genres have been populated successfully.");
    } catch (err) {
        console.error("Error populating books and genres:", err);
    } finally {
        await client.end();
    }
}

populateBooksGenres();
