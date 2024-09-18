const fs = require("fs");
const { Client } = require("pg");

// Path to the input JSON file
const inputFilePath = "../others/books.json";

// Read the original JSON file
fs.readFile(inputFilePath, "utf-8", (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Parse the JSON content
    let books;
    try {
        books = JSON.parse(data);
    } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        return;
    }

    // Clean and convert the data
    const cleanedBooks = books.map((book) => ({
        title: String(book.title),
        rating: Number(book.rating),
        language: String(book.language),
        pages: Number(book.pages),
        publishDate: isValidDate(book.publishDate)
            ? new Date(book.publishDate).toISOString().split("T")[0]
            : null,
        numRatings: Number(book.numRatings),
        coverImg: String(book.coverImg),
        price: Number(book.price),
        author: String(book.author),
        description: String(book.description),
        publisher: String(book.publisher),
    }));

    // Seed the cleaned data into the database
    seedBooks(cleanedBooks);
});

// Function to check if a date is valid
function isValidDate(date) {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate);
}

async function seedBooks(cleanedBooks) {
    const client = new Client({
        user: "ayon",
        host: "localhost",
        database: "library_app",
        password: "admin",
        port: 5433,
    });

    try {
        await client.connect();

        for (let i = 0; i < Math.min(100, cleanedBooks.length); i++) {
            const {
                title,
                rating,
                language,
                pages,
                publishDate,
                numRatings,
                coverImg,
                price,
                author,
                description,
                publisher,
            } = cleanedBooks[i];

            await client.query(
                "INSERT INTO books (title, rating, language, pages, publish_date, num_ratings, cover_img, price, author, description_text, publisher) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
                [
                    title,
                    rating,
                    language,
                    pages,
                    publishDate,
                    numRatings,
                    coverImg,
                    price,
                    author,
                    description,
                    publisher,
                ]
            );
        }

        console.log("Books data seeded successfully");
    } catch (err) {
        console.error("Error seeding books data:", err);
    } finally {
        await client.end();
    }
}
