const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');
const fs = require('fs');
const app = express();
const port = 3000;

const saltRounds = 10;

// Create a MySQL connection pool
require('dotenv').config();

// Create MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  // Connect to MySQL
  db.connect((error) => {
    if (error) {
      console.error('Database connection failed:', error);
      return;
    }
    console.log('Connected to the MySQL database.');
  });
  
  // Make db accessible to the router
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

// Your application code here...


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.loggedin) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Middleware to set loggedin status for views
app.use((req, res, next) => {
    res.locals.loggedin = req.session.loggedin || false;
    res.locals.user = req.session.user || null;
    next();
});

// Root Route
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        if (req.session.user.is_admin) {
            res.redirect('/admin-dashboard');
        } else {
            res.render('index');
        }
    } else {
        res.render('index');
    }
});

// Contact Form
app.get('/contact', (req, res) => {
    res.render('contact');
});

//contact stuff
app.set("port", port);
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "viewse/contact.ejs")))



app.post("/send_email", function(req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var text = req.body.text;
    var message = req.body.message;

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'davinjerlay@gmail.com', 
            pass: 'upli vydd cndj fuoq'

        }
    });

    var mailOptions = {
        from: req.body.email,
        to: 'davinjerlay@gmail.com',
        subject: 'Contact Form Request',
        html: `
            <h2 style="color: #333;">Contact Form</h2>
            <p><strong>Name:</strong> ${req.body.name}</p>
            <p><strong>Email:</strong> ${req.body.email}</p>
            <p><strong>Subject:</strong> ${req.body.title}</p>
            <p><strong>Message:</strong><br>${req.body.message}</p>
            <img src="https://i.postimg.cc/bY1Q0Q9W/logo.png" style="width: 200; height: auto;">
        `
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log(error);
            res.status(500).json({ success: false, message: 'Email could not be sent.' });
        } else {
            console.log("Email Sent: " + info.response);
            res.status(200).json({ success: true, message: 'Email sent successfully!' });
        }
        

    });
})

// Explore Route
app.get('/explore', (req, res) => {
    res.render('explore');
});

// Events Route
app.get('/events_new', (req, res) => {
    const getEventsQuery = 'SELECT * FROM events_new';
    db.query(getEventsQuery, (err, results) => {
        if (err) {
            console.error("Error fetching events:", err);
            res.status(500).send("Internal Server Error");
            return;
        }
        console.log("Events from database:", results);
        res.render('events_new', { events: results });
    });
});

// Authentication Routes
app.get('/register', (req, res) => {
    const message = req.query.message || '';
    res.render('register', { message });
});

app.get('/login', (req, res) => {
    const error = req.query.error || '';
    res.render('login', { error });
});

// Dashboard Route
app.get('/dashboard', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const userQuery = 'SELECT nickname, email FROM users WHERE id = ?';
    const bookingsQuery = 'SELECT id AS booking_id, room_type, check_in, check_out FROM bookings WHERE user_id = ? AND status = "active"';
    const eventsQuery = 'SELECT id, event_id, first_name, last_name, adults, children FROM eventTickets WHERE user_id = ?';

    db.query(userQuery, [userId], (error, userResults) => {
        if (error) {
            console.error("Error fetching user details:", error);
            res.status(500).send("Internal Server Error");
            return;
        }
        
        db.query(bookingsQuery, [userId], (bookingError, bookingResults) => {
            if (bookingError) {
                console.error("Error fetching bookings:", bookingError);
                res.status(500).send("Internal Server Error");
                return;
            }

            db.query(eventsQuery, [userId], (eventError, eventResults) => {
                if (eventError) {
                    console.error("Error fetching events:", eventError);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                const user = userResults[0];
                const bookings = bookingResults;
                const events = eventResults;

                res.render('dashboard', { user, bookings, events });
            });
        });
    });
});

// Admin Dashboard Route
app.get('/admin-dashboard', isAuthenticated, (req, res) => {
    if (req.session.user.is_admin) {
        const bookingQuery = `
            SELECT b.id, u.nickname, u.email, b.room_type, b.check_in, b.check_out, b.status, b.created_at AS booking_date
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC`;

        const userQuery = 'SELECT id, nickname, email FROM users';
        const eventQuery = 'SELECT * FROM events_new';
        const bookedEventsQuery = `
            SELECT et.id, u.nickname, u.email, e.name AS event_name, et.event_id, et.adults, et.children
            FROM eventTickets et
            LEFT JOIN users u ON et.user_id = u.id
            LEFT JOIN events_new e ON et.event_id = e.id`;

        db.query(bookingQuery, (bookingError, bookingResults) => {
            if (bookingError) throw bookingError;

            db.query(userQuery, (userError, userResults) => {
                if (userError) throw userError;

                db.query(eventQuery, (eventError, eventResults) => {
                    if (eventError) throw eventError;

                    db.query(bookedEventsQuery, (bookedEventsError, bookedEventsResults) => {
                        if (bookedEventsError) throw bookedEventsError;

                        res.render('admin-dashboard', {
                            user: req.session.user,
                            bookings: bookingResults,   // Pass bookings data here
                            users: userResults,
                            events: eventResults,
                            bookedEvents: bookedEventsResults
                        });
                    });
                });
            });
        });
    } else {
        res.redirect('/dashboard');
    }
});



// Registration Route
app.post('/register', (req, res) => {
    const { nickname, email, password, confirmPassword } = req.body;
    if (password === confirmPassword) {
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(checkEmailQuery, [email], (error, results) => {
            if (error) throw error;
            if (results.length > 0) {
                const user = results[0];
                if (user.status === 'inactive') {
                    // Update the existing user's details and set status to active
                    const updateUserQuery = 'UPDATE users SET nickname = ?, password = ?, status = ? WHERE email = ?';
                    bcrypt.hash(password, saltRounds, (err, hash) => {
                        if (err) throw err;
                        db.query(updateUserQuery, [nickname, hash, 'active', email], (updateError, updateResults) => {
                            if (updateError) throw updateError;

                            // Execute the Java program after reactivation
                            const jarPath = path.join('/Users/slaya/Desktop/EmailJar/email-sender/target', 'email-sender-1.0-SNAPSHOT.jar');
                            const mailJarPath = '/Users/slaya/SecondEJ/bookingemail-sender/target/dependency/javax.mail-1.6.2.jar';
                            const command = `java -cp "${jarPath}:${mailJarPath}" com.example.CustomOrderEmail ${user.id}`;

                            console.log(`Executing command: ${command}`);

                            exec(command, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`Error executing email sending program: ${error}`);
                                    console.error(stderr);
                                } else {
                                    console.log(`Email program output: ${stdout}`);
                                }
                            });

                            res.redirect('/login?message=account-reactivated');
                        });
                    });
                } else {
                    res.redirect('/register?message=email-exists');
                }
            } else {
                // Insert new user if no existing account with that email
                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) throw err;
                    const insertUserQuery = 'INSERT INTO users (nickname, email, password, is_admin, status) VALUES (?, ?, ?, ?, ?)';
                    const isAdmin = email.endsWith('@dvjl.com');
                    db.query(insertUserQuery, [nickname, email, hash, isAdmin, 'active'], (insertError, insertResults) => {
                        if (insertError) throw insertError;

                        // Execute the Java program after successful registration
                        const jarPath = path.join('/Users/slaya/Desktop/EmailJar/email-sender/target', 'email-sender-1.0-SNAPSHOT.jar');
                        const mailJarPath = '/Users/slaya/SecondEJ/bookingemail-sender/target/dependency/javax.mail-1.6.2.jar';
                        const command = `java -cp "${jarPath}:${mailJarPath}" com.example.CustomOrderEmail ${insertResults.insertId}`;

                        console.log(`Executing command: ${command}`);

                        exec(command, (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Error executing email sending program: ${error}`);
                                console.error(stderr);
                            } else {
                                console.log(`Email program output: ${stdout}`);
                            }
                        });

                        res.redirect('/login');
                    });
                });
            }
        });
    } else {
        res.redirect('/register?message=password-mismatch');
    }
});


// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            const user = results[0];
            if (user.status === 'inactive') {
                // Redirect to registration if the user's status is inactive
                return res.redirect('/register?message=account-inactive');
            }
            bcrypt.compare(password, user.password, (err, result) => {
                if (result) {
                    req.session.loggedin = true;
                    req.session.user = user;
                    if (user.is_admin) {
                        res.redirect('/admin-dashboard');
                    } else {
                        res.redirect('/');
                    }
                } else {
                    res.redirect('/login?error=invalid-password');
                }
            });
        } else {
            res.redirect('/login?error=invalid-email');
        }
    });
});


// Booking Route
app.post('/book', isAuthenticated, (req, res) => {
    const { roomType, checkIn, checkOut } = req.body;
    res.render('payment', { roomType, checkIn, checkOut });
});

const pathModule = require('path'); // Use a different variable name for the path module

// Handle the payment confirmation and email sending
app.post('/confirm-payment', isAuthenticated, (req, res) => {
    const { roomType, checkIn, checkOut } = req.body;
    const userId = req.session.user.id;
    const userName = req.session.user.nickname;

    // Insert booking into the database
    const insertBookingQuery = 'INSERT INTO bookings (user_id,user_name, room_type, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(insertBookingQuery, [userId, userName, roomType, checkIn, checkOut, 'active'], (error, results) => {
        if (error) {
            console.error('Error inserting booking:', error);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Log booking insertion success
        console.log(`Booking inserted for user ID: ${userId}`);

        // Call the Java program to send email to the customer
        const customerJarPath = pathModule.join('/Users/slaya/SecondEJ/bookingemail-sender/target', 'email-sender-1.0-SNAPSHOT.jar');
        const mailJarPath = pathModule.join('/Users/slaya/SecondEJ/bookingemail-sender/target/dependency/javax.mail-1.6.2.jar');
        const activationJarPath = pathModule.join('/Users/slaya/SecondEJ/bookingemail-sender/target/dependency/activation-1.1.1.jar');
        const mysqlJarPath = pathModule.join('/Users/slaya/SecondEJ/bookingemail-sender/target/dependency/mysql-connector-java-8.0.26.jar');
        const customerCommand = `java -cp "${customerJarPath}:${mailJarPath}:${activationJarPath}:${mysqlJarPath}" com.example.RoomBookingEmail ${userId} "${roomType}" "${checkIn}" "${checkOut}"`;

        console.log(`Executing customer email command: ${customerCommand}`);

        exec(customerCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing customer email sending program: ${error}`);
                console.error(stderr);
                return res.status(500).send(`Failed to send confirmation email: ${stderr}`);
            }
            console.log(`Customer email program output: ${stdout}`);
        });

        // Call the Java program to send email to the manager
        const managerJarPath = pathModule.join('/Users/slaya/davinjerlayco/MyJavaProject/target', 'email-sender-1.0-SNAPSHOT.jar');
        const managerCommand = `java -cp "${managerJarPath}:${mailJarPath}:${activationJarPath}:${mysqlJarPath}" com.example.sendManagerEmail ${userId}`;

        console.log(`Executing manager email command: ${managerCommand}`);

        exec(managerCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing manager email sending program: ${error}`);
                console.error(stderr);
                return res.status(500).send(`Failed to send manager email: ${stderr}`);
            }
            console.log(`Manager email program output: ${stdout}`);
            res.redirect(`/thank-you?userId=${userId}&roomType=${roomType}&checkIn=${checkIn}&checkOut=${checkOut}`);
        });
    });
});


// Edit Booking Route
app.post('/edit-booking', isAuthenticated, (req, res) => {
    const { bookingId, checkIn, checkOut, roomType } = req.body;
    const userId = req.session.user.id;
    const userName = req.session.user.nickname;
    const query = 'UPDATE bookings SET check_in = ?, check_out = ?, room_type = ? WHERE id = ? AND user_id = ?';
    db.query(query, [checkIn, checkOut, roomType, bookingId, userId], (error, results) => {
        if (error) throw error;
        const logQuery = 'INSERT INTO transactions (user_id, user_name, booking_id, action, room_type, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(logQuery, [userId, userName, bookingId, 'edit', roomType, checkIn, checkOut], (logError, logResults) => {
            if (logError) throw logError;
            res.redirect('/dashboard');
        });
    });
});

// Cancel Booking Route
app.post('/cancel-booking', isAuthenticated, (req, res) => {
    const { bookingId } = req.body;
    const userId = req.session.user.id;
    const userName = req.session.user.nickname;
    const updateQuery = 'UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?';

    db.query(updateQuery, ['canceled', bookingId, userId], (error, results) => {
        if (error) throw error;

        const logQuery = 'INSERT INTO transactions (user_id, user_name, booking_id, action) VALUES (?, ?, ?, ?)';
        db.query(logQuery, [userId, userName, bookingId, 'cancel'], (logError, logResults) => {
            if (logError) throw logError;

            // Call the Java program to send email
            const jarPath = '/Users/slaya/CancelingRoom/target/CancelingRoom-1.0-SNAPSHOT.jar';
            const mailJarPath = '/Users/slaya/CancelingRoom/target/lib/javax.mail-1.6.2.jar';
            const activationJarPath = '/Users/slaya/CancelingRoom/target/lib/activation-1.1.1.jar';
            const mysqlJarPath = '/Users/slaya/davinjerlayco/CancelingRoom/target/lib/mysql-connector-j-8.0.32.jar';
            const command = `java -cp "${jarPath}:${mailJarPath}:${activationJarPath}:${mysqlJarPath}" com.example.CancelingRoom ${userId}`;

            console.log(`Executing command: ${command}`);

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing email sending program: ${error}`);
                    console.error(stderr);
                    // Optionally, handle the error appropriately
                    return res.status(500).send(`Failed to send cancellation email: ${stderr}`);
                }
                console.log(`Email program output: ${stdout}`);
                res.redirect('/dashboard');
            });
        });
    });
});

// Rooms Route
app.get('/rooms', (req, res) => {
    const roomQuery = 'SELECT * FROM rooms';
    const bookingQuery = 'SELECT room_type, COUNT(*) as booked_count FROM bookings WHERE status = "active" GROUP BY room_type';

    db.query(roomQuery, (err, rooms) => {
        if (err) throw err;

        db.query(bookingQuery, (err, bookings) => {
            if (err) throw err;

            rooms.forEach(room => {
                const booking = bookings.find(b => b.room_type === room.type);
                room.available = room.room_limit - (booking ? booking.booked_count : 0);
                room.price = room.price; // Assuming price is a field in your database
            });

            res.render('rooms', { rooms });
        });
    });
});

app.get('/room', (req, res) => {
    const roomType = req.query.name;
    const query = 'SELECT * FROM rooms WHERE type = ?';
    db.query(query, [roomType], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const room = results[0];
            res.render('room', { roomType, room, loggedin: req.session.loggedin });
        } else {
            res.redirect('/rooms');
        }
    });
});


// Edit Event Route
app.post('/edit-event', isAuthenticated, (req, res) => {
    const { eventId, firstName, lastName, adults, children } = req.body;
    const query = 'UPDATE eventTickets SET first_name = ?, last_name = ?, adults = ?, children = ? WHERE id = ? AND user_id = ?';
    db.query(query, [firstName, lastName, adults, children, eventId, req.session.user.id], (error, results) => {
        if (error) {
            console.error("Error updating event:", error);
            res.status(500).send("Internal Server Error");
            return;
        }
        res.redirect('/dashboard');
    });
});

// Cancel Event Route
app.post('/cancel-event', isAuthenticated, (req, res) => {
    const { eventId } = req.body;
    const query = 'DELETE FROM eventTickets WHERE id = ? AND user_id = ?';
    db.query(query, [eventId, req.session.user.id], (error, results) => {
        if (error) {
            console.error("Error canceling event:", error);
            res.status(500).send("Internal Server Error");
            return;
        }
        res.redirect('/dashboard');
    });
});

// Download Account Info Route
app.get('/download-account-info', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [userId], (error, results) => {
        if (error) throw error;

        const user = results[0];
        const data = `
            User Information:
            -----------------
            Nickname: ${user.nickname}
            Email: ${user.email}
            Is Admin: ${user.is_admin ? 'Yes' : 'No'}
        `;

        fs.writeFileSync(`public/downloads/account-info-${userId}.txt`, data);
        res.download(`public/downloads/account-info-${userId}.txt`);
    });
});

// Book Event Routes
app.get('/book-event/:eventId', isAuthenticated, (req, res) => {
    const { eventId } = req.params;
    const getEventQuery = 'SELECT * FROM events_new WHERE id = ?';

    db.query(getEventQuery, [eventId], (err, results) => {
        if (err) {
            console.error("Error fetching event details:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        if (results.length === 0) {
            res.redirect('/events_new');
            return;
        }

        const event = results[0];
        res.render('ticket-form', { event });
    });
});

// Handle event ticket form submission
app.post('/book-event', isAuthenticated, (req, res) => {
    const { eventId, firstName, lastName, adults, children } = req.body;
    const userId = req.session.user.id;
    const numTickets = parseInt(adults) + parseInt(children);

    const insertTicket = `
        INSERT INTO eventTickets (user_id, event_id, first_name, last_name, adults, children)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertTicket, [userId, eventId, firstName, lastName, adults, children], (err, results) => {
        if (err) {
            console.error("Error booking event:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        const updateAvailability = `
            UPDATE events_new SET available_tickets = available_tickets - ? WHERE id = ?
        `;

        db.query(updateAvailability, [numTickets, eventId], (err, results) => {
            if (err) {
                console.error("Error updating event availability:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            const insertHistory = `
                INSERT INTO eventTicketHistory (user_id, event_id, first_name, last_name, adults, children)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertHistory, [userId, eventId, firstName, lastName, adults, children], (err, results) => {
                if (err) {
                    console.error("Error recording ticket history:", err);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                // Redirect to thank-you page with the necessary data
                res.redirect(`/thank-you?eventId=${eventId}&firstName=${firstName}&lastName=${lastName}&adults=${adults}&children=${children}`);
            });
        });
    });
});


// Thank You Page
app.get('/thank-you', isAuthenticated, (req, res) => {
    const { eventId, firstName, lastName, adults, children, userId, roomType, checkIn, checkOut } = req.query;

    if (roomType && checkIn && checkOut) {
        // Room booking thank you
        const getRoomQuery = 'SELECT * FROM rooms WHERE type = ?';

        db.query(getRoomQuery, [roomType], (err, results) => {
            if (err) {
                console.error("Error fetching room details:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (results.length === 0) {
                res.redirect('/rooms');
                return;
            }

            const room = results[0];
            const bookingData = {
                roomType,
                checkIn,
                checkOut,
                
            };

            res.render('thank-you', { bookingData, ticketData: null });
        });
    } else if (eventId) {
        // Event booking thank you
        const getEventQuery = 'SELECT * FROM events_new WHERE id = ?';

        db.query(getEventQuery, [eventId], (err, results) => {
            if (err) {
                console.error("Error fetching event details:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (results.length === 0) {
                res.redirect('/events_new');
                return;
            }

            const event = results[0];
            const ticketData = {
                event: event.name,
                firstName,
                lastName,
                adults,
                children
            };
            res.render('thank-you', { ticketData, bookingData: null });
        });
    } else {
        res.redirect('/');
    }
});





// Download Ticket Route
app.get('/download-ticket', isAuthenticated, (req, res) => {
    const eventId = req.query.eventId;
    const userId = req.session.user.id;

    console.log('Event ID:', eventId); // Debugging line
    console.log('User ID:', userId); // Debugging line

    const getEventDetailsQuery = 'SELECT * FROM events_new WHERE id = ?';
    const getTicketDetailsQuery = 'SELECT * FROM eventTickets WHERE event_id = ? AND user_id = ?';

    db.query(getEventDetailsQuery, [eventId], (err, eventResults) => {
        if (err) {
            console.error('Error fetching event details:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        console.log('Event Results:', eventResults); // Debugging line

        if (eventResults.length === 0) {
            res.status(404).send('Event not found');
            return;
        }

        const event = eventResults[0];

        db.query(getTicketDetailsQuery, [eventId, userId], (err, ticketResults) => {
            if (err) {
                console.error('Error fetching ticket details:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            console.log('Ticket Results:', ticketResults); // Debugging line

            if (ticketResults.length === 0) {
                res.status(404).send('Ticket not found');
                return;
            }

            const ticket = ticketResults[0];

            const ticketContent = `
                Event: ${event.name}
                Date: ${event.event_date}
                Max Tickets: ${event.max_tickets}
                Available Tickets: ${event.available_tickets}
                Name: ${ticket.first_name} ${ticket.last_name}
                Adults: ${ticket.adults}
                Children: ${ticket.children}
            `;

            res.setHeader('Content-Disposition', 'attachment; filename=ticket.txt');
            res.setHeader('Content-Type', 'text/plain');
            res.send(ticketContent);
        });
    });
});

app.get('/logout', (req, res) => {
    console.log('Logout route hit'); // Add this line for debugging
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

// Change Password Route
// Password change
app.post('/change-password', isAuthenticated, (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.session.user.id;

    if (newPassword !== confirmNewPassword) {
        return res.redirect('/dashboard?error=password-mismatch');
    }

    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [userId], (error, results) => {
        if (error) throw error;
        const user = results[0];
        bcrypt.compare(currentPassword, user.password, (err, result) => {
            if (result) {
                bcrypt.hash(newPassword, saltRounds, (hashError, hash) => {
                    if (hashError) throw hashError;
                    const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
                    db.query(updateQuery, [hash, userId], (updateError, updateResults) => {
                        if (updateError) throw updateError;
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'davinjerlay@gmail.com',
                                pass: 'upli vydd cndj fuoq'
                            }
                        });

                        const mailOptions = {
                            from: req.body.email,
                            to: user.email,
                            subject: 'Password changed successfully',
                            html: '<p>If you did not request a password change, please contact us immediately.</p>'
                        };

                        transporter.sendMail(mailOptions, (emailError, info) => {
                            if (emailError) {
                                console.error('Error sending email:', emailError);
                            } else {
                                console.log('Email sent:', info.response);
                            }
                        });

                        res.redirect('/dashboard?message=password-changed');
                    });
                });
            } else {
                res.redirect('/dashboard?error=invalid-current-password');
            }
        });
    });
});
// end of password change

// end of password change
app.post('/generate-report', (req, res) => {
    const jarPath = '/Users/slaya/davinjerlayco/MyJavaProjectReport/target/report-sender-1.0-SNAPSHOT.jar';
    const mailJarPath = '/Users/slaya/davinjerlayco/MyJavaProjectReport/target/lib/javax.mail-1.6.2.jar';
    const activationJarPath = '/Users/slaya/davinjerlayco/MyJavaProjectReport/target/lib/activation-1.1.jar';
    const mysqlJarPath = '/Users/slaya/davinjerlayco/MyJavaProjectReport/target/lib/mysql-connector-j-8.0.32.jar';

    const command = `java -cp "${jarPath}:${mailJarPath}:${activationJarPath}:${mysqlJarPath}" com.example.SendManagerReport`;

    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing report generation: ${error.message}`);
            return res.status(500).send('Error generating report');
        }

        if (stderr) {
            console.error(`Error in report generation: ${stderr}`);
            return res.status(500).send('Report generation failed');
        }

        console.log(`Report generated successfully: ${stdout}`);
        res.send('Report generated successfully');
    });
});


function updateUserStatusToInactive(userId) {
    return new Promise((resolve, reject) => {
        const sqlQuery = 'UPDATE users SET status = ? WHERE id = ?';
        const values = ['inactive', userId];

        db.query(sqlQuery, values, (err, result) => {
            if (err) {
                return reject(err);
            }
            if (result.affectedRows === 0) {
                return reject(new Error('User not found or status not updated'));
            }
            resolve(result);
        });
    });
}

app.post('/delete-user', (req, res) => {
    const userId = req.session.user.id; // Correctly retrieve the user ID from the session

    if (!userId) {
        console.error('No user ID found in session');
        return res.status(401).send('Unauthorized: No user ID found');
    }

    console.log('User ID:', userId);

    // Check if user exists before updating status
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length === 0) {
            console.error('No user found with ID:', userId);
            return res.status(404).send('User not found');
        }

        // Update the user's status to inactive
        updateUserStatusToInactive(userId)
            .then(() => {
                // Log the user out by destroying the session
                req.session.destroy(err => {
                    if (err) {
                        console.error('Error logging out:', err);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Redirect to the registration page
                    res.redirect('/register');
                });
            })
            .catch(err => {
                console.error('Error updating user status:', err);
                res.status(500).send('Internal Server Error');
            });
    });
});


function ensureAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Apply this middleware to routes that require authentication
app.use('/delete-user', ensureAuthenticated);

app.post('/edit-user', (req, res) => {
    const { nickname } = req.body;
    const userId = req.session.user.id;

    // Update the user's nickname in the database
    const query = 'UPDATE users SET nickname = ? WHERE id = ?';

    db.query(query, [nickname, userId], (err, results) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect back to the dashboard after updating the nickname
        res.redirect('/dashboard');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
