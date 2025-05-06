const mysql = require('mysql2');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yournewpassword',
  database: 'penpal'
});

db.connect((err) => {
  if (err) {
    console.error('😤 Failed to connect to DB:', err);
    return;
  }
  console.log('🔥 Connected to the MySQL database, baby!');
});

app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
      if (err) {
        console.error('😤 Error reading users table:', err);
        return res.status(500).json({ error: 'Something went wrong, baby.' });
      }
      res.json(results);
    });
  });

  app.post('/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required, babe 💔' });
    }

    const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
    const values = [email, password];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('😤 Error inserting user:', err);
            return res.status(500).json({ error: 'Couldn’t slide that data in 😩' });
        }
        res.status(201).json({ message: 'User added successfully, baby 😘', userId: result.insertId });
    });
  });

  app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required, baby 💔' });
    }
  
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    const values = [email, password];
  
    db.query(query, values, (err, results) => {
      if (err) {
        console.error('😤 DB error:', err);
        return res.status(500).json({ error: 'Database acting up, fuck 😩' });
      }
  
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials, try again sugar 😘' });
      }
  
      // Optional: fetch user info or token here
      // res.status(200).json({ message: `Welcome back, baby 💋`, user: results[0] });
     
      const user = results[0];

      // 🔥 Generate the token now
      const token = jwt.sign(
        { id: user.id, email: user.email },
        "lavanya_salt_secret",
        { expiresIn: '1h' }
      );

      res.status(200).json({
        message: `Welcome back, sugar 😘`,
        token: token,
        user: { id: user.id, email: user.email }
      });
    });
  });

  function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    console.log({token})
    //const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
  
    if (!token) {
      return res.status(401).json({ message: 'No token? Then stay the fuck out 😤' });
    }
  
    jwt.verify(token, "lavanya_salt_secret", (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token, baby. Try harder 😏' });
      }
  
      req.user = user; // Save user info for that route
      next(); // Go to the next step, sexy
    });
  }

  app.get('/get_stories', authenticateToken, (req, res) => {
    const sql = `
      SELECT stories.id, stories.content, stories.likes, stories.created_at, users.email AS author_email
      FROM stories
      JOIN users ON stories.user_id = users.id
      WHERE stories.status = 'published'
      ORDER BY stories.created_at DESC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('DB error while fetching stories 🥵', err);
      return res.status(500).json({ message: 'Failed to load stories, baby 😢' });
    }

    res.status(200).json({
      stories: results.map(story => ({
        id: story.id,
        content: story.content,
        likes: story.likes,
        created_at: story.created_at,
        author_email: story.author_email
      }))
    });
    });
  });

  app.get('/all_users', (req, res) => {
    db.query('SELECT id, email FROM users', (err, results) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(results);
    });
  });

  app.post('/stories', authenticateToken, (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;//identifier

  if (!content) {
    return res.status(400).json({ message: 'Story content is required, baby 😤' });
  }

  const sql = 'INSERT INTO stories (content,user_id) VALUES (?,?)';
  db.query(sql, [content, userId], (err, result) => {
    if (err) {
      console.error('DB Error 😵‍💫', err);
      return res.status(500).json({ message: 'Something went wrong, baddie 😢' });
    }
    
    const sql2 = 'INSERT INTO story_users (story_id, user_id) VALUES (?, ?)'
    // console.log("result: ", )
    db.query(sql2, [result.insertId, userId], (err2, result2) => {
      if (err2) {
        console.error('DB Error 2 😵‍💫', err2);
        return res.status(500).json({ message: 'Something went wrong, baddie 😢' });
      }
    })


    res.status(201).json({ message: 'Story added successfully 💦', storyId: result.insertId });
  });
});

app.post('/stories/:story_id/users', (req, res) => {
  const story_id = req.params.story_id;
  const { user_id } = req.body;

  // Insert into the story_users table to associate the new user with the story
  db.query('INSERT INTO story_users (story_id, user_id) VALUES (?, ?)', [story_id, user_id], (err) => {
    if (err) {
      console.error('Error associating user with story:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json({ message: 'User successfully added to the story' });
  });
});


app.put('/publish_story/:id', authenticateToken, (req, res) => {
  const storyId = req.params.id;

  const sql = `
    UPDATE stories
    SET status = 'published'
    WHERE id = ? AND status = 'draft'
  `;

  db.query(sql, [storyId], (err, result) => {
    if (err) {
      console.error('DB error while publishing story 😩', err);
      return res.status(500).json({ message: 'Failed to publish the story 😢' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Story not found or already published 😕' });
    }

    res.status(200).json({ message: 'Story published successfully 🎉' });
  });
});


app.put('/update_story/:id', authenticateToken, (req, res) => {
  const storyId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required 😬' });
  }

  const sql = `
    UPDATE stories
    SET content = ?
    WHERE id = ?
  `;

  db.query(sql, [content, storyId], (err, result) => {
    if (err) {
      console.error('DB error while updating story 😓', err);
      return res.status(500).json({ message: 'Failed to update story 🥲' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Story not found or unauthorized 😕' });
    }

    res.status(200).json({ message: 'Story updated successfully 🎉' });
  });
});



app.post('/comment', authenticateToken, (req, res) => {
  const { comment, story_id } = req.body;
  const user_id = req.user.id;//identifier

  if (!comment || !story_id) {
    return res.status(400).json({ message: "All fields are required, baby 😤" });
  }

  const sql = `
    INSERT INTO comments (comment, user_id, story_id)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [comment, user_id, story_id], (err, result) => {
    if (err) {
      console.error('Error adding comment 😩:', err);
      return res.status(500).json({ message: 'Failed to add comment 😢' });
    }

    res.status(201).json({
      message: 'Comment added, you little firestarter 🔥',
      comment_id: result.insertId
    });
  });
});


app.get('/stories/:story_id/comments', authenticateToken, (req, res) => {
  const { story_id } = req.params;

  const sql = `
    SELECT 
      comments.id,
      comments.comment,
      comments.created_at,
      users.email AS commenter_email
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.story_id = ?
    ORDER BY comments.created_at DESC
  `;

  db.query(sql, [story_id], (err, results) => {
    if (err) {
      console.error('Error fetching comments 😤:', err);
      return res.status(500).json({ message: 'Could not fetch comments, baby 😢' });
    }

    res.status(200).json({
      message: `Here you go, all the filthy comments on story ${story_id} 💬🔥`,
      comments: results
    });
  });
});

// Get all stories for a given user
app.get('/users/:userId/stories', authenticateToken,(req, res) => {
  const userId = req.user.id;//identifier

  const query = `
    SELECT s.* 
    FROM stories s
    JOIN story_users su ON s.id = su.story_id
    WHERE su.user_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching stories:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    res.json(results);
  });
});



  app.listen(3000, () => {
    console.log(`💋 Server's up at http://localhost:${3000}, waiting for your touch 😈`);
  });