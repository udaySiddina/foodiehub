const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Uday@@@1234',
  database: 'foodie_hub'
});



db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL Database!');
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(`Registering user: ${username}, Hashed Password: ${hashedPassword}`); // Log for debugging

  const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
  db.query(sql, [username, hashedPassword, email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error registering user' });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});
const session = require('express-session');

// Assuming you've set up express-session middleware like this:
app.use(session({
  secret: 'your-secret-key',  // replace with a secure key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }   // set to true if using HTTPS
}));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: Username: ${username}, Password: ${password}`); // Log for debugging

  const sql = 'SELECT * FROM users WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err || results.length === 0) {
      console.log('User not found or error:', err); // Log for debugging
      return res.status(400).json({ message: 'Invalid username or password' });
    } else {
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password match: ${isMatch}`); // Log for debugging
      if (isMatch) {
        // Store userId in session
        req.session.userId = user.id;  // Assuming `id` is the column name for user ID
        console.log(`User ID ${user.id} stored in session`); // Log for debugging
        return res.status(200).json({ message: 'Login successful' });
      } else {
        return res.status(400).json({ message: 'Invalid username or password' });
      }
    }
  });
});

// Checkout endpoint
app.post('/checkout', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const { cartItems, totalAmount, cardNumber, cvv } = req.body;

  // For security, hash the card details
  const hashedCardNumber = await bcrypt.hash(cardNumber, 10);
  const hashedCVV = await bcrypt.hash(cvv, 10);

  console.log(`Checkout initiated for userId: ${userId}, Total Amount: ${totalAmount}`);

  // Insert order details into the 'orders' table
  const sqlOrder = 'INSERT INTO orders (user_id, total_amount, card_number, cvv) VALUES (?, ?, ?, ?)';
  db.query(sqlOrder, [userId, totalAmount, hashedCardNumber, hashedCVV], (err, orderResult) => {
    if (err) {
      console.error('Error processing order:', err);
      return res.status(500).json({ message: 'Error processing checkout: order insertion failed' });
    }

    const orderId = orderResult.insertId;
    console.log(`Order ID ${orderId} created for userId ${userId}`);
// Assuming 'orderId' and 'cartItems' are defined

// Insert each cart item into the 'order_items' table
const sqlOrderItem = 'INSERT INTO order_items (order_id, item_name, quantity, price) VALUES ?';
const orderItemsData = cartItems.map(item => [orderId, item.name, item.quantity, item.price]);

console.log('Order ID:', orderId);
console.log('Items to insert:', orderItemsData); // Log the data being inserted

db.query(sqlOrderItem, [orderItemsData], (err) => {
    if (err) {
        console.error('Error adding order items:', err);
        return res.status(500).json({ message: 'Error adding order items' });
    }

    console.log(`Order items added for Order ID ${orderId}`);
    res.status(201).json({ message: 'Checkout completed successfully' });
});

  });
});


app.post('/pay', async (req, res) => {
  try {
    const { userId, items, totalAmount, cardDetails } = req.body;
    const sql = 'INSERT INTO orders (user_id, items, total_amount, card_number, cvv) VALUES (?, ?, ?, ?, ?)';
    
    // Execute the query
    await db.query(sql, [userId, items, totalAmount, cardDetails.number, cardDetails.cvv]);
    
    // Send success response
    console.log('Payment successful, data added to database');
    res.status(200).json({ message: 'Payment successful and data added to database' });
  } catch (err) {
    console.error('Error during payment:', err);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});



// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
