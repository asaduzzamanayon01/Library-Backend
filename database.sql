--users table
create table users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--default admin user
INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@library.com', '1234');


--books table
CREATE TABLE "books" (
  book_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  title VARCHAR(255) NOT NULL UNIQUE,
  rating DECIMAL(3, 2),
  language VARCHAR(50) NOT NULL,
  pages INT NOT NULL,
  publish_date DATE,
  num_ratings INT,
  cover_img VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description_text TEXT NOT NULL,
  publisher VARCHAR(255),
  like_count INT DEFAULT 0,
  created_at DATE DEFAULT CURRENT_DATE
);

-- Function to update like_count
CREATE OR REPLACE FUNCTION update_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.like THEN
    UPDATE books SET like_count = like_count + 1 WHERE book_id = NEW.book_id;
  ELSE
    UPDATE books SET like_count = like_count - 1 WHERE book_id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function after insert on interactions
CREATE TRIGGER after_insert_interactions
AFTER INSERT ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_like_count();

-- Trigger to call the function after update on interactions
CREATE TRIGGER after_update_interactions
AFTER UPDATE ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_like_count();

-- Trigger to call the function after delete on interactions
CREATE TRIGGER after_delete_interactions
AFTER DELETE ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_like_count();

--interactions table
CREATE TABLE "interactions" (
  interaction_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id),
  book_id INT REFERENCES books(book_id),
  "like" BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- genre table
CREATE TABLE "genres" (
    genre_id SERIAL PRIMARY KEY,
    genre_name VARCHAR(255) UNIQUE NOT NULL
)

-- Junction table
CREATE TABLE "book_genre" (
  "book_id" INT,
  "genre_id" INT,
  PRIMARY KEY ("book_id", "genre_id"),
  FOREIGN KEY ("book_id") REFERENCES books(book_id),
  FOREIGN KEY ("genre_id") REFERENCES genres(genre_id)
);
