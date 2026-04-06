const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt'); // Use bcrypt, not bcrypt-nodejs
let mongoServer;

// Attempt to connect to provided DB URI, fall back to in-memory MongoDB for tests/local development
const connectDB = async () => {
    const providedUri = process.env.DB;
    if (providedUri) {
        try {
            await mongoose.connect(providedUri, { serverSelectionTimeoutMS: 2000 });
            console.log('Connected to MongoDB');
            return;
        } catch (error) {
            console.warn('Failed to connect to provided MongoDB URI, falling back to in-memory MongoDB:', error.message);
        }
    }

    try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log('Connected to in-memory MongoDB');
    } catch (err) {
        console.error('Failed to start in-memory MongoDB:', err);
        process.exit(1);
    }
};

connectDB();


const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, required: true, index: { unique: true } },
    password: { type: String, required: true, select: false }
});

UserSchema.pre('save', async function(next) {  // Use async/await for cleaner code
    const user = this;

    if (!user.isModified('password')) return next();

    try {
        const hash = await bcrypt.hash(user.password, 10); // 10 is the salt rounds (adjust as needed)
        user.password = hash;
        next();
    } catch (err) {
        return next(err);
    }
});

UserSchema.methods.comparePassword = async function(password) { // Use async/await
    try {
        return await bcrypt.compare(password, this.password);
    } catch (err) {
        return false; // Or handle the error as you see fit
    }
};

module.exports = mongoose.model('User', UserSchema);