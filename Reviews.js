var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ReviewSchema = new Schema({
	username: { type: String, required: true },
	movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
	review: { type: String, required: true },
	rating: { type: Number, required: true },
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);