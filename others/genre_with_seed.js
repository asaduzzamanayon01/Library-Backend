const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// Path to the books.json file
const booksFilePath = path.join(__dirname, "books.json");

// PostgreSQL client configuration
const client = new Client({
    user: "ayon",
    host: "localhost",
    database: "library_app",
    password: "admin",
    port: 5433,
});

// Connect to the PostgreSQL database
client
    .connect()
    .then(() => {
        console.log("Connected to the database");

        // Read the books.json file
        fs.readFile(booksFilePath, "utf8", (err, data) => {
            if (err) {
                console.error("Error reading books.json:", err);
                return;
            }

            try {
                const books = JSON.parse(data);
                const allGenres = [];

                books.forEach((book) => {
                    if (book.genre && typeof book.genre === "string") {
                        // Remove unnecessary characters and parse the genre string manually
                        const genres = book.genre
                            .replace(/[\r\/\\]/g, "")
                            .trim();
                        const genreArray = genres
                            .slice(1, -1)
                            .split(",")
                            .map((genre) => genre.trim().replace(/^"|"$/g, ""));
                        allGenres.push(...genreArray);
                    }
                });

                // Create a set to filter out duplicate genres
                const uniqueGenres = [...new Set(allGenres)];

                // console.log("All Genres:", allGenres);
                // console.log("Unique Genres:", uniqueGenres);

                // Seed the genres table
                const insertGenres = async () => {
                    for (const genre of uniqueGenres) {
                        await client.query(
                            "INSERT INTO genres (genre_name) VALUES ($1) ON CONFLICT (genre_name) DO NOTHING",
                            [genre]
                        );
                    }
                    console.log("Genres have been seeded");
                    client.end();
                };

                insertGenres().catch((err) => {
                    console.error("Error inserting genres:", err);
                    client.end();
                });
            } catch (parseErr) {
                console.error("Error parsing JSON:", parseErr);
            }
        });
    })
    .catch((err) => {
        console.error("Error connecting to the database:", err);
    });
