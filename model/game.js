const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
    UserName: {
        type: String,
        required: true
    },
    Result: {
        type: Number,
        required: true
    },
    Train: {
        type: Array,
        required: true
    }
});

schema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model("Game", schema);