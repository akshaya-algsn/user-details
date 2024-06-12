const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const useragent = require('useragent');
const geoip = require('geoip-lite');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');

mongoose.set('strictQuery', false);

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view engine', 'ejs');

// Connect to MongoDB
const mongoUrl = "mongodb+srv://aa1456:pass@akshaya.b1xivch.mongodb.net/?retryWrites=true&w=majority&appName=Akshaya";

mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => console.log(e));

// User Schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    loginHistory: Array,
    otp: String
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (user) {
        const agent = useragent.parse(req.headers['user-agent']);
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const geo = geoip.lookup(ip);

        const userAgentString = req.headers['user-agent'];

        let bro;
            if (userAgentString.includes('Edg')|| userAgentString.includes('EdgA')) {
           bro = "Microsoft Edge";
            } else {
             bro = agent.toAgent();
            }

        const loginInfo = {
            browser: bro,
            os: agent.os.toString(),
            device: agent.device.toString(),
            ip: ip,
            location: geo ? `${geo.city}, ${geo.country}` : "Location not found",
            timestamp: new Date()
        };

        user.loginHistory.push(loginInfo);
        await user.save();

        // Log the full user-agent string for debugging
        console.log(`User-Agent: ${req.headers['user-agent']}`);
        console.log(`Parsed browser: ${agent.toAgent()}`);

       

        if (userAgentString.includes('Edg') || userAgentString.includes('EdgA')) {
            // Edge browser
            res.redirect(`/home?email=${email}`);
        } else if (userAgentString.includes('Chrome')) {
            // Chrome browser
            // Generate OTP and send email

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            await user.save();

            // Send OTP via email
            var transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: "krishnakumarbm63@gmail.com",
                  pass: "akshaya", //use two step authenticate password
                },
              });
          
              var mailOptions = {
                from: "krishnakumar63@gmail.com",
                to: {email},
                subject: "OTP Request",
                text: otp,
              };
          
            //   transporter.sendMail(mailOptions, function (error, info) {
            //     if (error) {
            //       console.log(error);
            //     } else {
            //       console.log("Email sent: " + info.response);
            //     }
            //   });
            res.redirect(`/app?email=${email}`);

           

        } else if (agent.device.toString().includes('Mobile')) {
            const currentHour = new Date().getHours();
            if (currentHour >= 10 && currentHour <= 13) {
                res.redirect(`/home?email=${email}` );
            } else {
                res.send('Access to the website is allowed only between 10 AM and 1 PM on mobile devices.');
            }
        } else {
            res.redirect(`/home?email=${email}`);
        }

    } else {
        res.send('Invalid email or password');
    }
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });

    if (user) {
        res.redirect(`/home?email=${email}`);
    } else {
        res.redirect(`/home?email=${email}`);
    }
});

app.get('/home', (req, res) => {
    res.render('home', { email: req.query.email });
});

app.get('/app', (req, res) => {
    res.render('otp', { email: req.query.email });
  });

app.get('/login-history', async (req, res) => {
    const email = req.query.email;

    // Debugging: Check if the email parameter is undefined or empty
    if (!email) {
        console.log('Email parameter is missing or empty');
        return res.send('Email parameter is missing or empty');
    }
    console.log(`Looking for user with email: ${email}`); // Debugging statement

    try {
        const user = await User.findOne({ email });

        if (user) {
            console.log('User found:', user); // Debugging statement
            res.render('login-history', { history: user.loginHistory });
        } else {
            console.log('User not found'); // Debugging statement
            res.send('User not found');
        }
    } catch (error) {
        console.error('Error retrieving user:', error); // Debugging statement
        res.status(500).send('Error retrieving user');
    }
});

// Start Server
const PORT = process.env.PORT || 5001; // Changed to port 5001

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
