// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Konfigurasi koneksi SQL Server
const config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_SERVER as string,
  port: parseInt(process.env.DB_PORT as string, 10),
  database: process.env.DB_DATABASE as string,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Mengonversi string 'true' menjadi boolean
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true', // Sama seperti di atas
  },
};

export default config;
