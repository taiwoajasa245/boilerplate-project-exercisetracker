const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const { type } = require('express/lib/response');
const URI = process.env.MONGODB_URI;


app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to help get the post request from the index.js



// Schema

const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String,
  date: String,
  duration: Number,
  description: String,
  count: { type: Number, default: 0 },
  log: [{
    description: String,
    duration: Number,
    date: String,
  }]
});

// setup model
const Users = mongoose.model('User', userSchema);

// connect db 
const connectDB = async () => {
  try {
    const db = await mongoose.connect(URI);
    if (db) {
      console.log('connected to mongo database');
    }
  } catch (err) {
    console.log(err);
  }
}

connectDB();


// routes

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {

  try {

    const users = await Users.find({}).select('_id username');
    if (!users) {
      res.status(404).json({ error: "user not found" });
    } else {
      res.status(200).json(users);
    }

  } catch (error) {
    console.log(error);
  }

});


app.post('/api/users', async (req, res) => {
  const { username } = req.body;


  try {

    const user = new Users({ username });
    const saveduser = await user.save();

    if (saveduser) {
      res.status(200).json({

        username: saveduser.username,
        _id: saveduser._id
      })
    }

  } catch (error) {
    console.log(error)
  }


});

app.post('/api/users/:_id/exercises', async (req, res) => {

  try {

    const { _id } = req.params;
    let { description, duration, date } = req.body;



    // Find the document by ID
    const userFind = await Users.findById(_id);

    if (!userFind) {
      return res.status(404).json({ error: 'user id not found' });
    }


    if (!date) {
      const today = new Date();
      date = today.toDateString();
    } else {
      const userDate = new Date(date);
      date = userDate.toDateString();
    }


    // Update the document with additional data
    userFind.description = description;
    userFind.duration = duration;
    userFind.date = date;


    // Update the document with additional data
    userFind.log.push({ description, duration, date });
    userFind.count += 1; // Increment the count



    // Save the updated document
    await userFind.save();

    // Construct the updated user object to send back in the response
    const updatedUser = {
      _id: userFind._id,
      username: userFind.username,
      date: userFind.date,
      duration: userFind.duration,
      description: userFind.description,
    };

    res.status(200).json(updatedUser);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }


});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  let { from, to, limit } = req.query;

  try {
    // Parse limit parameter to integer, default to 0 if not provided
    limit = parseInt(limit) || 0;

    // Find the user document by ID
    const userFind = await Users.findById(_id);

    if (!userFind) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter logs based on from and to dates if provided
    let filteredLogs = userFind.log;

    if (from) {
      filteredLogs = filteredLogs.filter(log => new Date(log.date) >= new Date(from));
    }

    if (to) {
      filteredLogs = filteredLogs.filter(log => new Date(log.date) <= new Date(to));
    }

    // Limit the number of logs after filtering
    if (limit > 0) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    // Construct the user log object to send back in the response
    const userLog = {
      _id: userFind._id,
      username: userFind.username,
      count: userFind.count,
      log: filteredLogs
    };

    res.status(200).json(userLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
