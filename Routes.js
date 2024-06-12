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

        const loginInfo = {
            browser: agent.toAgent(),
            os: agent.os.toString(),
            device: agent.device.toString(),
            ip: ip,
            location: geo,
            timestamp: new Date()
        };

        user.loginHistory.push(loginInfo);
        await user.save();

        if (agent.toAgent().includes('Chrome')) {
            // Generate OTP and send email
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            await user.save();

            // Send OTP via email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'your-email@gmail.com',
                    pass: 'your-email-password'
                }
            });

            const mailOptions = {
                from: 'your-email@gmail.com',
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is ${otp}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).send('Error sending email');
                } else {
                    res.render('otp', { email: email });
                }
            });

        } else if (agent.toAgent().includes('Edge')) {
            res.redirect('/home');
        } else if (agent.device.toString().includes('Mobile')) {
            const currentHour = new Date().getHours();
            if (currentHour >= 10 && currentHour <= 13) {
                res.redirect('/home');
            } else {
                res.send('Access to the website is allowed only between 10 AM and 1 PM on mobile devices.');
            }
        } else {
            res.redirect('/home');
        }

    } else {
        res.send('Invalid email or password');
    }
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });

    if (user) {
        res.redirect('/home');
    } else {
        res.send('Invalid OTP');
    }
});

app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/login-history', async (req, res) => {
    const { email } = req.query;
    const user = await User.findOne({ email });

    if (user) {
        res.render('login-history', { history: user.loginHistory });
    } else {
        res.send('User not found');
    }
});
