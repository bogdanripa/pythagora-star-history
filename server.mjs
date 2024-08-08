import 'dotenv/config';
import express from 'express';
import Serverless from "serverless-http";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import mongoose from 'mongoose';
import path from 'path';
import flash from 'express-flash';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

// Needed to mimic __dirname behavior in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Passport configuration for User authentication
import './config/passport.js';

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // middleware to handle URL encoded data
app.use(express.static(path.join(__dirname, 'public')));

try {
  // Set EJS as the view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  console.log('View engine set to EJS');
} catch (error) {
  console.error('Error setting the view engine:', error.stack);
}

// Session configuration
app.use(session({
  secret: 'star_history_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(`MongoDB connection error: ${err.stack}`));

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Import authentication routes
import authRoutes from './routes/auth.js';
app.use(authRoutes);

// Import GitHub routes
import githubRoutes from './routes/github.js';

// Middleware to require login/auth
import authRequired from './middlewares/authRequired.js';

// Serve the main page only if the user is authenticated
app.get('/', authRequired, (req, res, next) => {
  res.render('index', {user: req.user}, function(err, html) {
    if (err) {
      console.error('Error rendering index:', err.stack); // gpt_pilot_debugging_log
      return next(err);
    }
    res.send(html);
  });
});

// Use GitHub routes
app.use('/github', githubRoutes);

// Example protected route
app.get('/dashboard', authRequired, (req, res) => {
  res.send('Welcome to your dashboard.');
});

// Routes for authentication (included above) and other functionality would be added here

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('An internal server error occurred: ', err.stack);
  res.status(err.statusCode || 500).send(err.message || 'An unexpected error occurred.');
});

export const handler = Serverless(app);

/*
// Start the server and listen on the env port or default to 3000
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started on port ${server.address().port}`);
}).on('error', (err) => {
  console.error(`Failed to start the server on port ${process.env.PORT || 3000}:`, err.stack);
});
*/
