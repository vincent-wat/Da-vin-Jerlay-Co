const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const port = 3000;

const saltRounds = 10;

// Create a MySQL connection pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',  // Replace with your MySQL password
    database: 'hotel_db'
});

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

app.get('/explore', (req, res) => {
    res.render('explore');
});

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

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/register', (req, res) => {
    const message = req.query.message || '';
    res.render('register', { message });
});

app.get('/login', (req, res) => {
    const error = req.query.error || '';
    res.render('login', { error });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const query = `
        SELECT u.nickname, u.email, b.id AS booking_id, b.room_type, b.check_in, b.check_out, b.status
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        WHERE u.id = ? AND (b.status = 'active' OR b.status IS NULL)`;

    db.query(query, [userId], (error, results) => {
        if (error) {
            console.error("Error fetching user details:", error);
            res.status(500).send("Internal Server Error");
            return;
        }
        if (results.length === 0) {
            res.render('dashboard', { user: req.session.user, bookings: [] });
            return;
        }
        const user = { nickname: results[0].nickname, email: results[0].email };
        const bookings = results.filter(result => result.booking_id !== null);
        res.render('dashboard', { user, bookings });
    });
});

app.get('/admin-dashboard', isAuthenticated, (req, res) => {
    if (req.session.user.is_admin) {
        const transactionQuery = `
            SELECT t.id, u.nickname, u.email, t.action, t.room_type, t.check_in, t.check_out, t.timestamp
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.timestamp DESC`;

        const userQuery = 'SELECT id, nickname, email FROM users';

        db.query(transactionQuery, (transactionError, transactionResults) => {
            if (transactionError) throw transactionError;

            db.query(userQuery, (userError, userResults) => {
                if (userError) throw userError;

                res.render('admin-dashboard', {
                    user: req.session.user,
                    transactions: transactionResults,
                    users: userResults
                });
            });
        });
    } else {
        res.redirect('/dashboard');
    }
});

app.post('/register', (req, res) => {
    const { nickname, email, password, confirmPassword } = req.body;
    if (password === confirmPassword) {
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(checkEmailQuery, [email], (error, results) => {
            if (error) throw error;
            if (results.length > 0) {
                res.redirect('/register?message=email-exists');
            } else {
                const isAdmin = email.endsWith('@dvjl.com');
                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) throw err;
                    const insertUserQuery = 'INSERT INTO users (nickname, email, password, is_admin) VALUES (?, ?, ?, ?)';
                    db.query(insertUserQuery, [nickname, email, hash, isAdmin], (error, results) => {
                        if (error) throw error;
                        res.redirect('/login');
                    });
                });
            }
        });
    } else {
        res.redirect('/register?message=password-mismatch');
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (error, results) => {
        if (error) throw error;
        if (results.length > 0) {
            const user = results[0];
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
            res.redirect('/dashboard');
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

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
                        res.redirect('/dashboard?message=password-changed');
                    });
                });
            } else {
                res.redirect('/dashboard?error=invalid-current-password');
            }
        });
    });
});

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
            res.render('room', { roomType, room: results[0], loggedin: req.session.loggedin });
        } else {
            res.redirect('/rooms');
        }
    });
});

app.post('/book', isAuthenticated, (req, res) => {
    const { roomType, checkIn, checkOut } = req.body;
    res.render('payment', { roomType, checkIn, checkOut });
});

app.post('/confirm-payment', isAuthenticated, (req, res) => {
    const { roomType, checkIn, checkOut, cardNumber, cardExpiry, cardCVC } = req.body;
    const userId = req.session.user.id;
    const userName = req.session.user.nickname;
    const query = 'INSERT INTO bookings (user_id, user_name, room_type, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, "active")';
    db.query(query, [userId, userName, roomType, checkIn, checkOut], (err, results) => {
        if (err) throw err;
        const bookingId = results.insertId;
        const logQuery = 'INSERT INTO transactions (user_id, user_name, booking_id, action, room_type, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(logQuery, [userId, userName, bookingId, 'reserve', roomType, checkIn, checkOut], (logErr, logResults) => {
            if (logErr) throw logErr;
            res.render('confirmation', { roomType, checkIn, checkOut });
        });
    });
});

app.post('/edit-transaction', isAuthenticated, (req, res) => {
    const { transactionId, checkIn, checkOut, roomType } = req.body;
    const action = 'edit';

    if (!action || !checkIn || !checkOut || !roomType) {
        res.redirect('/admin-dashboard?error=missing-fields');
        return;
    }

    const getBookingIdQuery = 'SELECT booking_id FROM transactions WHERE id = ?';
    db.query(getBookingIdQuery, [transactionId], (error, results) => {
        if (error) {
            console.error("Error fetching booking ID:", error);
            res.status(500).send("Internal Server Error");
            return;
        }

        const bookingId = results[0].booking_id;

        const updateBookingQuery = 'UPDATE bookings SET check_in = ?, check_out = ?, room_type = ? WHERE id = ?';
        db.query(updateBookingQuery, [checkIn, checkOut, roomType, bookingId], (error, results) => {
            if (error) {
                console.error("Error updating booking:", error);
                res.status(500).send("Internal Server Error");
                return;
            }

            const userId = req.session.user.id;
            const userName = req.session.user.nickname;

            const insertTransactionQuery = 'INSERT INTO transactions (user_id, user_name, booking_id, action, room_type, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?, ?)';
            const updateTransactionQuery = 'UPDATE transactions SET status = ? WHERE id = ?';

            db.query(insertTransactionQuery, [userId, userName, bookingId, action, roomType, checkIn, checkOut], (insertError, insertResults) => {
                if (insertError) {
                    console.error("Error inserting transaction:", insertError);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                db.query(updateTransactionQuery, ['inactive', transactionId], (updateError, updateResults) => {
                    if (updateError) {
                        console.error("Error updating transaction status:", updateError);
                        res.status(500).send("Internal Server Error");
                        return;
                    }

                    res.redirect('/admin-dashboard');
                });
            });
        });
    });
});

app.post('/cancel-transaction', isAuthenticated, (req, res) => {
    const { transactionId } = req.body;
    const action = 'cancel';

    if (!transactionId) {
        res.redirect('/admin-dashboard?error=missing-transactionId');
        return;
    }

    const getBookingIdQuery = 'SELECT booking_id FROM transactions WHERE id = ?';
    db.query(getBookingIdQuery, [transactionId], (error, results) => {
        if (error) {
            console.error("Error fetching booking ID:", error);
            res.status(500).send("Internal Server Error");
            return;
        }

        const bookingId = results[0].booking_id;

        const updateBookingQuery = 'UPDATE bookings SET status = "canceled" WHERE id = ?';
        db.query(updateBookingQuery, [bookingId], (error, results) => {
            if (error) {
                console.error("Error updating booking:", error);
                res.status(500).send("Internal Server Error");
                return;
            }

            const userId = req.session.user.id;
            const userName = req.session.user.nickname;

            const insertTransactionQuery = 'INSERT INTO transactions (user_id, user_name, booking_id, action) VALUES (?, ?, ?, ?)';
            const updateTransactionQuery = 'UPDATE transactions SET action = ? WHERE id = ?';

            db.query(insertTransactionQuery, [userId, userName, bookingId, action], (insertError, insertResults) => {
                if (insertError) {
                    console.error("Error inserting transaction:", insertError);
                    res.status(500).send("Internal Server Error");
                    return;
                }

                db.query(updateTransactionQuery, ['inactive', transactionId], (updateError, updateResults) => {
                    if (updateError) {
                        console.error("Error updating transaction status:", updateError);
                        res.status(500).send("Internal Server Error");
                        return;
                    }

                    res.redirect('/admin-dashboard');
                });
            });
        });
    });
});

app.post('/edit-user', isAuthenticated, (req, res) => {
    const { userId, nickname, email } = req.body;

    const updateUserQuery = 'UPDATE users SET nickname = ?, email = ? WHERE id = ?';
    db.query(updateUserQuery, [nickname, email, userId], (error, results) => {
        if (error) {
            console.error("Error updating user:", error);
            res.status(500).send("Internal Server Error");
            return;
        }

        const insertUserHistoryQuery = 'INSERT INTO user_history (user_id, nickname, email) VALUES (?, ?, ?)';
        db.query(insertUserHistoryQuery, [userId, nickname, email], (insertError, insertResults) => {
            if (insertError) {
                console.error("Error inserting user history:", insertError);
                res.status(500).send("Internal Server Error");
                return;
            }

            res.redirect('/admin-dashboard');
        });
    });
});

app.post('/delete-user', isAuthenticated, (req, res) => {
    const { userId } = req.body;

    const updateUserStatusQuery = 'UPDATE users SET status = ? WHERE id = ?';
    db.query(updateUserStatusQuery, ['inactive', userId], (error, results) => {
        if (error) {
            console.error("Error updating user status:", error);
            res.status(500).send("Internal Server Error");
            return;
        }

        res.redirect('/admin-dashboard');
    });
});

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

                res.redirect(`/thank-you?eventId=${eventId}&firstName=${firstName}&lastName=${lastName}&adults=${adults}&children=${children}`);
            });
        });
    });
});

// Thank You Page// Thank You Page
app.get('/thank-you', isAuthenticated, (req, res) => {
    const { eventId, firstName, lastName, adults, children } = req.query;
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
        res.render('thank-you', { ticketData });
    });
});


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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
