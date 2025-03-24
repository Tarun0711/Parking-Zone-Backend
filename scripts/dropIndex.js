const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function dropIndex() {
    try {
        // Connect to MongoDB with the URI from .env
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'test' // Specify the database name
        });
        console.log('Connected to MongoDB');

        // Get the users collection
        const usersCollection = mongoose.connection.collection('users');
        
        // Drop the userId index
        await usersCollection.dropIndex('userId_1');
        console.log('Successfully dropped userId_1 index');

        await mongoose.connection.close();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error);
    }
}

dropIndex(); 