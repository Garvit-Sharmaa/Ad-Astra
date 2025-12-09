import mongoose from 'mongoose';

const connectDB = () => {
  return new Promise<void>(async (resolve, reject) => {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      return reject(new Error('FATAL ERROR: MONGO_URI is not defined in the .env file.'));
    }

    // --- SANITIZATION STEP ---
    // Fixes common .env formatting mistakes shown in your screenshot:
    // 1. Trim leading/trailing whitespace.
    mongoUri = mongoUri.trim();
    // 2. Remove leading/trailing double quotes or single quotes.
    const originalUri = mongoUri;
    mongoUri = mongoUri.replace(/^["']|["']$/g, '');
    // 3. Remove trailing semicolon (common when copying from code).
    mongoUri = mongoUri.replace(/;$/, '');

    // Debug log to confirm the clean URI (passwords hidden)
    const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`   Attempting to connect to MongoDB...`);
    
    if (originalUri !== mongoUri) {
        console.log(`   ✨ Connection string was automatically sanitized to remove quotes/semicolons.`);
    }
    console.log(`   Cleaned URI: ${maskedUri}`);

    try {
      // Connect using Mongoose with the Stable API options you provided
      await mongoose.connect(mongoUri, {
        serverApi: {
          version: '1',
          strict: true,
          deprecationErrors: true,
        }
      });
      console.log("✅ MongoDB Connected successfully!");
      resolve();
    } catch (error) {
      console.error('❌ MongoDB connection error.');
      console.error('   1. Check if your IP is whitelisted in MongoDB Atlas (Network Access tab).');
      console.error('   2. Check if your <db_password> is correct in the .env file.');
      
      // Log the actual error object for detailed inspection
      console.error('   Detailed Error:', error);
      
      // Rejecting allows the main server file to exit gracefully instead of crashing
      reject(new Error('Database connection failed.')); 
    }
  });
};

export default connectDB;