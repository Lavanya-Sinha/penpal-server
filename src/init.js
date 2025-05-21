const mysql = require("mysql2");

// Create database if it doesn't exist
const dbInit = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin",
});

dbInit.connect((err) => {
  if (err) {
    console.error("Failed to connect to MySQL server:", err);
    process.exit(1);
  }
  dbInit.query("CREATE DATABASE IF NOT EXISTS penpal", (err) => {
    if (err) {
      console.error("Failed to create database:", err);
      process.exit(1);
    }
    dbInit.end();

    // DB connection
    const db = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "admin",
      database: "penpal", // Ensure DB exists
    });

    db.connect((err) => {
      if (err) {
        console.error("Failed to connect to DB:", err);
        process.exit(1);
      }

      console.log("Connected to MySQL. Creating tables...");

      const tableQueries = [
        `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fullname VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS stories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          author VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          story_id INT NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          comment_content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS collaborators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            story_id INT NOT NULL,
            email VARCHAR(255) NOT NULL,
            FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
            );
        `,
      ];

      const runQuery = (query, label) => {
        return new Promise((resolve, reject) => {
          db.query(query, (err) => {
            if (err) {
              console.error(`Error in "${label}":`, err.message);
              reject(err);
            } else {
              console.log(`Success: ${label}`);
              resolve();
            }
          });
        });
      };

      const insertData = async () => {
        console.log("Inserting sample data...");

        try {
          await runQuery(
            `
            INSERT INTO users (fullname, email, password) VALUES
            ('John Smith', 'john.smith@penpal.com', 'hashed-password-123'),
            ('Emily Johnson', 'emily.johnson@penpal.com', 'password123'),
            ('Michael Brown', 'michael.brown@penpal.com', 'securepass456');
          `,
            "Inserted users"
          );

          await runQuery(
            `
              INSERT INTO stories (title, content, author) VALUES
              ('The Silent Manor', 
              'The old manor stood silent at the edge of town. Every evening, Anna would hear faint footsteps in the hallway, but when she checked, the corridor was empty. She soon discovered a series of letters hidden beneath the floorboards, each revealing a piece of the manor’s mysterious past. As she pieced together the story, Anna realized the house was not haunted by malice, but by memories longing to be remembered.', 
              'john.smith@penpal.com'),

              ('The Garden Promise', 
              'Under the blooming cherry tree, David waited each evening, holding a letter he hoped to deliver. The garden was a place of shared dreams and quiet reflection. As the seasons changed, so did his hope, until one night, a familiar figure appeared, and the promise of the past was renewed.', 
              'emily.johnson@penpal.com'),

              ('Code and Connection', 
              'Every night, Alex worked late, chasing a persistent bug in the codebase. The error messages seemed almost personal, as if someone was reaching out through the lines of code. Through collaboration and late-night problem-solving, Alex and a remote contributor, Sarah, built not just a solution, but a lasting professional partnership.', 
              'michael.brown@penpal.com');
            `,
            "Inserted stories"
          );

          await runQuery(
            `
            INSERT INTO comments (story_id, user_name, user_email, comment_content) VALUES
            (1, 'Emily Johnson', 'emily.johnson@penpal.com', 'This story is very intriguing.'),
            (1, 'Michael Brown', 'michael.brown@penpal.com', 'Excellent writing and atmosphere.'),
            (2, 'John Smith', 'john.smith@penpal.com', 'Beautifully written and evocative.'),
            (3, 'Emily Johnson', 'emily.johnson@penpal.com', 'Great example of teamwork and problem-solving.');
          `,
            "Inserted comments"
          );

          await runQuery(
            `
            INSERT INTO collaborators (story_id, email) VALUES
            (1, 'emily.johnson@penpal.com'),
            (1, 'michael.brown@penpal.com'),
            (2, 'john.smith@penpal.com');
          `,
            "Inserted collaborators"
          );

          console.log(
            "Sample data inserted successfully. Database initialization complete."
          );
        } catch (err) {
          console.error("Error during data insert:", err.message);
        } finally {
          db.end();
        }
      };

      const createAllTables = async () => {
        for (let i = 0; i < tableQueries.length; i++) {
          await runQuery(tableQueries[i], `Created table #${i + 1}`);
        }
        await insertData();
      };

      createAllTables();
    });
  });
});
