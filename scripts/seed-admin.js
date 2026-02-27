const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@decp.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'secret123';

async function seedAdmin() {
  const authDb = mongoose.createConnection(MONGODB_URI, { dbName: 'decp_auth' });
  const usersDb = mongoose.createConnection(MONGODB_URI, { dbName: 'decp_users' });

  authDb.on('error', console.error.bind(console, 'authDb connection error:'));
  usersDb.on('error', console.error.bind(console, 'usersDb connection error:'));

  const userAuthSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    refreshTokens: [{ type: String }]
  }, { timestamps: true });

  const userProfileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, default: 'admin' },
  }, { timestamps: true });

  const AuthUser = authDb.model('User', userAuthSchema);
  const ProfileUser = usersDb.model('User', userProfileSchema);

  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    let authUser = await AuthUser.findOne({ email: ADMIN_EMAIL });
    if (!authUser) {
      authUser = new AuthUser({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin'
      });
      await authUser.save();
      console.log('Created admin auth user with ID:', authUser._id);
    } else {
      console.log('Admin auth user already exists.');
    }

    let profileUser = await ProfileUser.findById(authUser._id);
    if (!profileUser) {
      profileUser = new ProfileUser({
        _id: authUser._id,
        name: 'System Admin',
        role: 'admin'
      });
      await profileUser.save();
      console.log('Created admin profile user with ID:', profileUser._id);
    } else {
      console.log('Admin profile user already exists.');
    }

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    authDb.close();
    usersDb.close();
  }
}

seedAdmin();
