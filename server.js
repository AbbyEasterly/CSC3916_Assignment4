const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt'); // You're not using authController, consider removing it
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies'); // You're not using Movie, consider removing it
const Review = require('./Reviews');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

// Removed getJSONObjectForMovieRequirement as it's not used

router.post('/signup', async (req, res) => { // Use async/await
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({ success: false, msg: 'Please include both username and password to signup.' }); // 400 Bad Request
  }

  try {
    const user = new User({ // Create user directly with the data
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    await user.save(); // Use await with user.save()

    res.status(200).json({ success: true, msg: 'Successfully created new user.' });
  } catch (err) {
    if (err.code === 11000) { // Strict equality check (===)
      return res.status(409).json({ success: false, message: 'A user with that username already exists.' }); // 409 Conflict
    } else {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
    }
  }
});


router.post('/signin', async (req, res) => { // Use async/await
  try {
    const user = await User.findOne({ username: req.body.username }).select('name username password');

    if (!user) {
      return res.status(401).json({ success: false, msg: 'Authentication failed. User not found.' }); // 401 Unauthorized
    }

    const isMatch = await user.comparePassword(req.body.password); // Use await

    if (isMatch) {
      const userToken = { id: user._id, username: user.username }; // Use user._id (standard Mongoose)
      const token = jwt.sign(userToken, process.env.SECRET_KEY, { expiresIn: '1h' }); // Add expiry to the token (e.g., 1 hour)
      res.json({ success: true, token: 'JWT ' + token });
    } else {
      res.status(401).json({ success: false, msg: 'Authentication failed. Incorrect password.' }); // 401 Unauthorized
    }
  } catch (err) {
    console.error(err); // Log the error
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); // 500 Internal Server Error
  }
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find({}).sort({ title: 1 });
      return res.status(200).json(movies);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve movies.' });
    }
    })
    .post(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movie = new Movie(req.body);
      if (!movie.title) {
        return res.status(400).json({ success: false, message: 'Movie title is required.' });
      }
      else if (movie.releaseDate && (movie.releaseDate < 1900 || movie.releaseDate > 2100)) {
        return res.status(400).json({ success: false, message: 'Release date must be between 1900 and 2100.' });
      }
  
      else {
      const savedMovie = await movie.save();
      return res.status(200).json({ movie: savedMovie });}
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to create movie.' });
    }
    })
    .put(authJwtController.isAuthenticated, async (req, res) => {
    try {      const { title, releaseDate, genre, actors } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, message: 'Movie title is required.' });
      } 
      else if (releaseDate && (releaseDate < 1900 || releaseDate > 2100)) {
        return res.status(400).json({ success: false, message: 'Release date must be between 1900 and 2100.' });
      }
      const updatedMovie = await Movie.findOneAndUpdate({ title }, { releaseDate, genre, actors }, { new: true });
      if (!updatedMovie) {
        return res.status(404).json({ success: false, message: 'Movie not found.' });
      } 
      return res.status(200).json({ movie: updatedMovie });
    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to update movie.' });
    } 
    })
    .delete(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const { title } = req.body; 
      if (!title) {
        return res.status(400).json({ success: false, message: 'Movie title is required.' });
      } 
      const deletedMovie = await Movie.findOneAndDelete({ title });
      if (!deletedMovie) {
        return res.status(404).json({ success: false, message: 'Movie not found.' });
      }
      return res.status(200).json({ success: true, message: 'Movie deleted successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to delete movie.' });
    }
      })
    
    
    ;


app.use('/', router);

router.route('/Reviews')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const reviews = await Review.find({}).populate('movieId').sort({ createdAt: -1 });
      return res.status(200).json(reviews);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const review = new Review(req.body);
      // populate username from authenticated user if not provided
      if (!review.username && req.user && req.user.username) {
        review.username = req.user.username;
      }

      if (!review.username || !review.movieId || !review.review || review.rating === undefined) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }

      const savedReview = await review.save();
      return res.status(200).json({ review: savedReview, message: 'Review created!' });

    } catch (err) {
      if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to create review.' });
    }

    })


    .delete(authJwtController.isAuthenticated, async (req, res) => {
    try {      const { id } = req.body; 
      if (!id) {
        return res.status(400).json({ success: false, message: 'Review ID is required.' });
      } 
        const deletedReview = await Review.findByIdAndDelete(id);
        if (!deletedReview) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }
        return res.status(200).json({ success: true, message: 'Review deleted successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to delete review.' });
    }   
  });

const PORT = process.env.PORT || 8080; // Define PORT before using it
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // for testing only