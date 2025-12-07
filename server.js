const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
// const dotenv = require('dotenv').config(); // Uncomment if using .env file

const app = express();

// --- CONFIGURATION ---
const port = process.env.PORT || 3000;
const uri = "mongodb+srv://admin:zjaiwZ5m3ev4a7O2@cluster0.vvtvmol.mongodb.net/?appName=Cluster0"; 

// --- MIDDLEWARE ---

// 1. CORS (Allows frontend to talk to backend)
app.use(cors());

// 2. Body Parser (To read JSON data from POST requests)
app.use(express.json());

// 3. Logger Middleware (Requirement: Middleware A)
// Outputs all requests to the server console
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.originalUrl}`);
    next();
});

// 4. Static File Middleware (Requirement: Middleware B)
// Serves images from the 'public' folder. 
// If image exists, it returns it. If not, it falls through to 404.
app.use('/images', express.static(path.join(__dirname, 'public')));

// Middleware to handle missing images gracefully
app.use('/images', (req, res, next) => {
    res.status(404).send("Image not found");
});

// --- MONGODB CONNECTION ---
let db;
MongoClient.connect(uri)
    .then(client => {
        db = client.db('afterschool'); // Connect to 'afterschool' database
        console.log('Connected to MongoDB Atlas');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });


// --- REST API ROUTES ---

// 1. GET Route: Fetch all lessons (Requirement: GET Route)
app.get('/lessons', (req, res) => {
    db.collection('lessons').find({}).toArray()
        .then(results => {
            res.json(results);
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// 2. POST Route: Save a new order (Requirement: POST Route)
app.post('/orders', (req, res) => {
    const orderData = req.body;
    db.collection('orders').insertOne(orderData)
        .then(result => {
            res.status(201).json(result);
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// 3. PUT Route: Update lesson spaces (Requirement: PUT Route)
// Using updateOne with $set (or $inc) to update available spaces
app.put('/lessons/:id', (req, res) => {
    const lessonId = new ObjectId(req.params.id);
    const newSpace = req.body.space; // Expecting { "space": 4 } in body

    db.collection('lessons').updateOne(
        { _id: lessonId },
        { $set: { space: newSpace } }
    )
    .then(result => {
        res.json({ message: 'Space updated successfully' });
    })
    .catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// 4. SEARCH Route (Requirement: Search Functionality - Approach 2)
// This performs a regex search on 'topic' OR 'location'
app.get('/search', (req, res) => {
    const query = req.query.q; // e.g., /search?q=math
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
    }

    // Using Regex for partial match, 'i' for case insensitive
    const searchRegex = new RegExp(query, 'i');

    db.collection('lessons').find({
        $or: [
            { topic: searchRegex },
            { location: searchRegex }
        ]
    }).toArray()
    .then(results => {
        res.json(results);
    })
    .catch(err => {
        res.status(500).json({ error: err.message });
    });
});


// Start the Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});