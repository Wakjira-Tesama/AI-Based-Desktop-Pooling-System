require('dotenv').config();
const mongoose = require('mongoose');
const Desktop = require('./src/models/Desktop');

async function seedDesktops() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://bulbula:Wakjirat2@cluster0.vi67s6q.mongodb.net/sdpms?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);

  const desktops = [];

  // 10 desktops for 'applied'
  for (let i = 1; i <= 10; i++) {
    desktops.push({
      desktop_id: `APP-PC-${String(i).padStart(2, '0')}`,
      ip_address: `10.0.1.${100 + i}`,
      status: 'available',
      library: 'applied',
    });
  }

  // 10 desktops for 'central'
  for (let i = 1; i <= 10; i++) {
    desktops.push({
      desktop_id: `CEN-PC-${String(i).padStart(2, '0')}`,
      ip_address: `10.0.2.${100 + i}`,
      status: 'available',
      library: 'central',
    });
  }

  for (const desktopData of desktops) {
    await Desktop.findOneAndUpdate(
      { desktop_id: desktopData.desktop_id },
      { ...desktopData },
      { upsert: true, new: true }
    );
    console.log(`Desktop ${desktopData.desktop_id} seeded for library "${desktopData.library}".`);
  }

  console.log("Desktop seeding complete!");
  mongoose.connection.close();
}

seedDesktops().catch(console.error);
