const app = require('./app'); 
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server berjalan dengan lancar di http://localhost:${PORT}`);
  console.log("   Folder 'public' sedang disajikan sebagai file statis.");
  console.log("   Tekan CTRL+C untuk menghentikan server.");
});
