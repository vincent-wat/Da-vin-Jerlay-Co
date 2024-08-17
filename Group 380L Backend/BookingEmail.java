import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;
import java.util.Date;

public class BookingEmail {

    /**
     * Main method that handles the process of sending the manager report email.
     * 
     * @param args Command-line arguments (not used in this implementation).
     */
    public static void main(String[] args) {
        // Database Setup
        String jdbcURL = "jdbc:mysql://localhost:3306/hotel_db";
        String dbUser = "root";
        String dbPassword = "1234"; 

        // Sender's Email
        String sender = "davinjerlay@gmail.com";

        // Gmail Service Setup
        String host = "smtp.gmail.com";

        Properties properties = System.getProperties();
        properties.setProperty("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "587");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.ssl.trust", "smtp.gmail.com");

        // Retrieve properties
        Session session = Session.getInstance(properties, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(sender, "upli vydd cndj fuoq");
            }
        });

        // Hardcoded user ID for demonstration purposes
        int userId = 17;

        // Variables to store user information

        Customer cust = null;
        Booking book =  null;
        Room room =  null;

        try {
            // Database Connection
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            // Query for customer's email, nickname
            String sql = "SELECT email, nickname FROM users WHERE id = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(sql);
            preparedStatement.setInt(1, userId);
            ResultSet customerResultSet = preparedStatement.executeQuery();

            if (customerResultSet.next()) {
                String email = customerResultSet.getString("email");
                String nickname = customerResultSet.getString("nickname");
                cust = new Customer(nickname, userId, email);
            }

            // Query for check-in and check-out dates
            String bookingSql = "SELECT check_in, check_out FROM bookings WHERE user_id = ?";
            PreparedStatement bookingStatement = connection.prepareStatement(bookingSql);
            bookingStatement.setInt(1, userId);
            ResultSet bookingResultSet = bookingStatement.executeQuery();

            Date checkInDate =null;
            Date checkOutDate =null;
            if (bookingResultSet.next()) {
                 checkInDate = bookingResultSet.getDate("check_in");
                 checkOutDate = bookingResultSet.getDate("check_out");
            }

            // Query for room type
            String roomsSQL = "SELECT room_type FROM bookings WHERE user_id = ?";
            PreparedStatement roomStatement = connection.prepareStatement(roomsSQL);
            roomStatement.setInt(1, userId);
            ResultSet roomResultSet = roomStatement.executeQuery();

            if (roomResultSet.next()) {
                String roomTypeString = roomResultSet.getString("room_type");
                RoomType roomType = RoomType.fromDatabase(roomTypeString);
                room = new Room(roomType);
            }
            
            book = new Booking(checkInDate, checkOutDate, room);

            // Close all database resources
            roomResultSet.close();
            roomStatement.close();
            customerResultSet.close();
            preparedStatement.close();
            bookingResultSet.close();
            bookingStatement.close();
            connection.close();

        } catch (SQLException e) {
            e.printStackTrace();
        }

        try {
            // Create the email message
            MimeMessage message = new MimeMessage(session);

            // Set the sender's email address
            message.setFrom(new InternetAddress(sender));

            // Set the recipient's email address
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(cust.getEmail()));

            // Set the email subject
            message.setSubject("Hotel Reservation Manager Report");

            // Multipart to combine text and image parts
            Multipart multipart = new MimeMultipart();

            // Create the email body
            MimeBodyPart textPart = new MimeBodyPart();
            String emailContent = "<div style='font-family: Arial, sans-serif; color: black;'>" +
                                  "<p>A customer has booked a room." + "</p>" +
                                  "<p><u><strong>Order Details: " + "</strong></u></p>" +
                                  "<p><strong>Name: </strong>" + cust.getName() + "</p>" +
                                  "<p><strong>Room Type:</strong> " + room.getRoomType() + "</p>" +
                                  "<p><strong>Check-in time:</strong> " + book.getCheckInDate() + "</p>" +
                                  "<p><strong>Check-out time:</strong> " + book.getCheckOutDate() + "</p>" +
                                  "<br><img src='cid:logo' width='500' height='88'>" +
                                  "</div>";
            textPart.setContent(emailContent, "text/html");

            // Create the image part
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("logo.png"); // Replace with the path to your image
            imagePart.setDataHandler(new DataHandler(source));
            imagePart.setHeader("Content-ID", "<logo>");

            // Combine text and image into the multipart
            multipart.addBodyPart(textPart);
            multipart.addBodyPart(imagePart);
            message.setContent(multipart);

            // Send the email
            Transport.send(message);
            System.out.println("Mail successfully sent");
        } catch (MessagingException mex) {
            mex.printStackTrace();
        }
    }
}
