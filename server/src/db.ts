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
        },
        // Add a reasonable timeout so it fails faster if IP is blocked
        serverSelectionTimeoutMS: 5000, 
      });
      console.log("✅ MongoDB Connected successfully!");
      resolve();
    } catch (error: any) {
      console.error('\n❌ MongoDB connection error.');
      
      // Check for specific "ReplicaSetNoPrimary" error which indicates IP blocking
      const isReplicaSetError = error.reason?.type === 'ReplicaSetNoPrimary' || 
                                error.cause?.type === 'ReplicaSetNoPrimary' ||
                                (error.message && error.message.includes('ReplicaSetNoPrimary'));

      if (isReplicaSetError) {
          console.error('\n\x1b[41m\x1b[37m 🛑 CRITICAL: IP ADDRESS NOT WHITELISTED \x1b[0m');
          console.error('\x1b[33mThe "ReplicaSetNoPrimary" error means your computer cannot reach the MongoDB servers.\x1b[0m');
          console.error('\x1b[33mThis is almost always because your current IP address is not allowed in MongoDB Atlas.\x1b[0m');
          console.error('\n👉 \x1b[1mHOW TO FIX:\x1b[0m');
          console.error('   1. Go to your MongoDB Atlas Dashboard.');
          console.error('   2. Click "Network Access" in the left sidebar.');
          console.error('   3. Click "Add IP Address".');
          console.error('   4. Select "Add Current IP Address" (or "Allow Access from Anywhere" for development).');
          console.error('   5. Wait 1-2 minutes for changes to apply, then restart this server.\n');
      } else {
          console.error('   1. Check if your IP is whitelisted in MongoDB Atlas (Network Access tab).');
          console.error('   2. Check if your <db_password> is correct in the .env file.');
      }
      
      // Log the actual error object for detailed inspection
      console.error('   Detailed Error:', error);
      
      // Rejecting allows the main server file to exit gracefully instead of crashing
      reject(new Error('Database connection failed.')); 
    }
  });
};

export default connectDB;