require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./src/models/Student');

async function seedAdmins() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://bulbula:Wakjirat2@cluster0.vi67s6q.mongodb.net/sdpms?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);

  const admins = [
    {
      student_id: 'admin_applied',
      name: 'Applied Library Admin',
      email: 'applied_admin@astu.edu.et',
      password: 'admin_applied_pass',
      is_admin: true,
      library: 'applied',
      is_verified: true
    },
    {
      student_id: 'admin_central',
      name: 'Central Library Admin',
      email: 'central_admin@astu.edu.et',
      password: 'admin_central_pass',
      is_admin: true,
      library: 'central',
      is_verified: true
    }
  ];

  for (const adminData of admins) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    await Student.findOneAndUpdate(
      { email: adminData.email },
      { ...adminData, password: hashedPassword },
      { upsert: true, new: true }
    );
    console.log(`Admin ${adminData.email} seeded/updated.`);
  }

  mongoose.connection.close();
}

seedAdmins().catch(console.error);
