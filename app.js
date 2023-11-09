require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// db connection
const mongoDb = process.env.MONGO_URL;
mongoose.connect(mongoDb);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));
console.log('connected to mongoDB');

// models
const User = mongoose.model(
	'User',
	new Schema({
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		email: { type: String, required: true },
		password: { type: String, required: true },
		membership: { type: Boolean, required: true }
	})
);

const Message = mongoose.model(
	'Message',
	new Schema({
		author: { type: String, required: true },
		text: { type: String, required: true },
		timestamp: { type: Date, required: true }
	})
);

// view setup
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// passport setup
passport.use(
	new LocalStrategy(async (username, password, done) => {
		try {
			const user = await User.findOne({ email: username });
			if (!user) {
				return done(null, false, { message: 'Incorrect username' });
			}
			const match = await bcrypt.compare(password, user.password);
			if (!match) {
				return done(null, false, { message: 'Incorrect password' });
			}
		} catch (err) {
			return done(err);
		}
	})
);

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});

// init session, passport, and other middleware
app.use(session({ secret: 'cute kitties', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

// routes
app.get('/', (req, res) => {
  res.render('index');
})

// start server
app.listen(3000, () => console.log('app listening on port 3000!'))