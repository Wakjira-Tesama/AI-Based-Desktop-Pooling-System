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
    const existing = await Student.findOne({ email: adminData.email });
    if (existing) {
      console.log(`Admin ${adminData.email} already exists.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      await Student.create({ ...adminData, password: hashedPassword });
      console.log(`Admin ${adminData.email} created.`);
    }
  }

  mongoose.connection.close();
}

seedAdmins().catch(console.error);
