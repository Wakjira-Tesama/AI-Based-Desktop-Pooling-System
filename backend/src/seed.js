const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');
const Desktop = require('./models/Desktop');
const logger = require('./utils/logger');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sdpms';

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Seeding database...');

    // 1. Seed Admin
    const adminExists = await Student.findOne({ is_admin: true });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await Student.create({
        student_id: 'MGR001',
        name: 'Library Manager',
        email: 'manager@test.com',
        password: hashedPassword,
        is_admin: true,
        library: 'central'
      });
      logger.info('Admin user created');
    }

    // 2. Seed Test Student
    const studentExists = await Student.findOne({ student_id: 'STU001' });
    if (!studentExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await Student.create({
        student_id: 'STU001',
        name: 'Test Student',
        email: 'student@test.com',
        password: hashedPassword,
        is_admin: false,
        library: 'central'
      });
      logger.info('Test student created');
    }

    // 3. Seed Desktops
    await Desktop.deleteMany({}); // Wipe existing to re-seed
    
    const desktops = [];
    
    // Central library desktops
    for (let i = 1; i <= 10; i++) {
      desktops.push({
        desktop_id: `LIB-${i.toString().padStart(3, '0')}`,
        ip_address: `192.168.1.${9 + i}`,
        library: 'central',
        status: 'available'
      });
    }

    // Applied library desktops
    for (let i = 1; i <= 10; i++) {
      desktops.push({
        desktop_id: `APP-${i.toString().padStart(3, '0')}`,
        ip_address: `192.168.2.${9 + i}`,
        library: 'applied',
        status: 'available'
      });
    }

    await Desktop.insertMany(desktops);
    logger.info('10 initial desktops created for both central and applied libraries');

    logger.info('Seeding complete');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', error);
    process.exit(1);
  }
};

seed();
