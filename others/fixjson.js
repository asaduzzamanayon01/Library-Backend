const fs = require("fs");
const path = require("path");

// Path to the books.json file
const filePath = path.join(__dirname, "/cleaned_date.json");

// Read the JSON file
fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    // Parse the JSON data
    let books = JSON.parse(data);

    // Remove the specified properties from each book object
    books = books.map((book) => {
        delete book.likedPercent;
        return book;
    });

    // Write the updated data back to the JSON file
    fs.writeFile(filePath, JSON.stringify(books, null, 2), "utf8", (err) => {
        if (err) {
            console.error("Error writing to the file:", err);
            return;
        }
        console.log("File has been updated successfully.");
    });
});
