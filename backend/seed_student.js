require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./src/models/Student');

async function seedUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://bulbula:Wakjirat2@cluster0.vi67s6q.mongodb.net/sdpms?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);

  const users = [
    {
      student_id: 'UGR/0001/14',
      name: 'Test Student',
      email: 'student@astu.edu.et',
      password: 'student_pass',
      is_admin: false,
      is_verified: true
    }
  ];

  for (const userData of users) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    await Student.findOneAndUpdate(
      { email: userData.email },
      { ...userData, password: hashedPassword },
      { upsert: true, new: true }
    );
    console.log(`Student ${userData.email} seeded/updated.`);
  }

  mongoose.connection.close();
}

seedUsers().catch(console.error);
