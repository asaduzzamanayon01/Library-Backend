const fs = require("fs");
const filePath = "../others/books_old.json";
const cleanedFilePath = "../others/cleaned.json";

fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
        console.error("Error reading the file:", err);
        return;
    }

    try {
        const books = JSON.parse(data);

        books.forEach((book) => {
            for (let key in book) {
                if (key !== "coverImg" && typeof book[key] === "string") {
                    // Remove all unnecessary characters and whitespaces
                    book[key] = book[key].replace(/[\r\/\\]/g, "").trim();
                }
            }
        });

        fs.writeFile(cleanedFilePath, JSON.stringify(books, null, 2), (err) => {
            if (err) {
                console.error("Error writing the file:", err);
            } else {
                console.log("File has been cleaned and saved as cleaned.json.");

                // Step 2: Remove all occurrences of '\"' from cleaned.json
                fs.readFile(cleanedFilePath, "utf-8", (err, cleanedData) => {
                    if (err) {
                        console.error("Error reading the cleaned file:", err);
                        return;
                    }

                    const cleanedDataWithoutQuotes = cleanedData.replace(
                        /\\"/g,
                        ""
                    );
                    fs.writeFile(
                        cleanedFilePath,
                        cleanedDataWithoutQuotes,
                        (err) => {
                            if (err) {
                                console.error(
                                    "Error writing the cleaned file:",
                                    err
                                );
                            } else {
                                console.log(
                                    "All occurrences of '\"' have been removed from cleaned.json."
                                );
                            }
                        }
                    );
                });
            }
        });
    } catch (error) {
        console.error("Error parsing JSON:", error);
    }
});
