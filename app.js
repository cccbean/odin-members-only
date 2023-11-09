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
		membership: { type: Boolean, required: true },
    admin: {type: Boolean, required: false}
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
			return done(null, user);
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
app.get('/', async (req, res) => {
	const messages = await Message.find().sort({ timestamp: 1 }).exec();
	res.render('index', {
		user: req.user,
		messages: messages,
		errorMsg: null
	});
});

app.post(
	'/log-in',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/'
	})
);

app.get('/log-out', (req, res, next) => {
	req.logout((err) => {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

app.post('/membership', async (req, res) => {
	if (req.body.password === 'cats') {
		const user = new User({
			_id: req.user._id,
			firstName: req.user.firstName,
			lastName: req.user.lastName,
			email: req.user.email,
			password: req.user.password,
			membership: true
		});
		await User.findByIdAndUpdate(req.user._id, user);
		res.redirect('/');
	} else {
	  const messages = await Message.find().sort({ timestamp: 1 }).exec();
		res.render('index', {
			user: req.user,
			messages: messages,
			errorMsg: 'Incorrect password! :P'
		});
	}
});

app.post('/admin', async (req, res) => {
	if (req.body.password === 'admin') {
		const user = new User({
			_id: req.user._id,
			firstName: req.user.firstName,
			lastName: req.user.lastName,
			email: req.user.email,
			password: req.user.password,
			membership: true,
      admin: true
		});
		await User.findByIdAndUpdate(req.user._id, user);
		res.redirect('/');
	} else {
	  const messages = await Message.find().sort({ timestamp: 1 }).exec();
		res.render('index', {
			user: req.user,
			messages: messages,
			errorMsg: 'Incorrect password! :P'
		});
	}
});

app.post('/add-message', async (req, res) => {
	const message = new Message({
		author: req.user.firstName,
		text: req.body.message,
		timestamp: new Date()
	});
	await message.save();
	res.redirect('/');
});

app.post('/delete/:id', async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.redirect('/');
})

app.get('/sign-up', (req, res) => {
	res.render('sign-up-form', {
		title: 'Sign-up'
	});
});

app.post('/sign-up', (req, res, next) => {
	bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
		if (err) {
			return next(err);
		} else {
			const user = new User({
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				email: req.body.email,
				password: hashedPassword,
				membership: false
			});
			await user.save();
			res.redirect('/');
		}
	});
});

// start server
app.listen(3000, () => console.log('app listening on port 3000!'));
