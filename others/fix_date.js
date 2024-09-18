const fs = require("fs");
const path = require("path");

// Path to the input JSON file
const inputFilePath = path.join(__dirname, "../others/cleaned.json");
// Path to the output JSON file
const outputFilePath = path.join(__dirname, "./cleaned_date.json");

// Function to fix the publishDate format
const fixPublishDate = (dateStr) => {
    if (dateStr.length === 8) {
        const month = dateStr.slice(0, 1);
        const day = dateStr.slice(1, 3);
        const year = dateStr.slice(4);
        return `${parseInt(month)}/${parseInt(day)}/${year}`;
    } else if (dateStr.length === 7) {
        const month = dateStr.slice(0, 1);
        const day = dateStr.slice(1, 3);
        const year = dateStr.slice(3);
        return `${parseInt(month)}/${parseInt(day)}/${year}`;
    } else if (dateStr.length === 6) {
        const month = dateStr.slice(0, 1);
        const day = dateStr.slice(1, 2);
        const year = dateStr.slice(2);
        return `${parseInt(month)}/${parseInt(day)}/${year}`;
    }
    return dateStr;
};

// Read the JSON file
fs.readFile(inputFilePath, "utf-8", (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    try {
        const books = JSON.parse(data);

        books.forEach((book) => {
            if (book.publishDate && typeof book.publishDate === "string") {
                book.publishDate = fixPublishDate(book.publishDate);
            }
        });

        fs.writeFile(outputFilePath, JSON.stringify(books, null, 2), (err) => {
            if (err) {
                console.error("Error writing the file:", err);
            } else {
                console.log(
                    "File has been fixed and saved as fixed_books.json."
                );
            }
        });
    } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
    }
});
