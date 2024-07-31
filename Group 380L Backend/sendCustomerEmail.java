import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

public class sendCustomerEmail {
    public static void main(String[] args) {
        // Database Setup
        String jdbcURL = "jdbc:mysql://localhost:3306/hotel_db";
        String dbUser = "root";
        String dbPassword = "A1a2a3a4"; 

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
                return new PasswordAuthentication("davinjerlay@gmail.com", "uekmsandurunfuna");
            }
        });

        // TODO: Currently hardcoded, needs to match the user ordering
        int userId = 2;

        // Database Connection + User Info Queries
        String recipientEmail = null;
        String nickname = null;
        String checkInDate = null;
        String checkOutDate = null;
        String roomIds = null;
		
		try {
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            // Query for email at customer user ID
            String sql = "SELECT email FROM users WHERE id = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(sql);
            preparedStatement.setInt(1, userId);
            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {
                recipientEmail = resultSet.getString("email");
            }

            // Query for name at customer user ID
            String nicknameSql = "SELECT nickname FROM users WHERE id = ?";
            PreparedStatement nicknameStatement = connection.prepareStatement(nicknameSql);
            nicknameStatement.setInt(1, userId);
            ResultSet nicknameResultSet = nicknameStatement.executeQuery();

            if (nicknameResultSet.next()) {
                nickname = nicknameResultSet.getString("nickname");
            }

            // Query for check in/out times at customer user ID
            String bookingSql = "SELECT check_in, check_out FROM bookings WHERE user_id = ?";
            PreparedStatement bookingStatement = connection.prepareStatement(bookingSql);
            bookingStatement.setInt(1, userId);
            ResultSet bookingResultSet = bookingStatement.executeQuery();

            if (bookingResultSet.next()) {
                checkInDate = bookingResultSet.getString("check_in");
                checkOutDate = bookingResultSet.getString("check_out");
            }

            // Query for room_num at customer user ID
            String roomsSQL = "SELECT room_type FROM bookings WHERE user_id = ?";
            PreparedStatement roomStatement = connection.prepareStatement(roomsSQL);
            roomStatement.setInt(1, userId);
            ResultSet roomResultSet = roomStatement.executeQuery();

            if (roomResultSet.next()) {
                roomIds = roomResultSet.getString("room_type");
            }
            
            roomIds= roomIds.substring(0, 1).toUpperCase() + roomIds.substring(1);

            roomResultSet.close();
            roomStatement.close();
            nicknameResultSet.close();
            nicknameStatement.close();
            connection.close();

        } catch (SQLException e) {
            e.printStackTrace();
        }

        try {
            MimeMessage message = new MimeMessage(session);

            // Set sender
            message.setFrom(new InternetAddress(sender));

            // Set recipient
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(recipientEmail));

            // Set subject
            message.setSubject("Hotel Reservation Email Confirmation");

            // Multipart for body/image separation
            Multipart multipart = new MimeMultipart();

            // Create the body
            int oldRoomIdsLength = roomIds.toString().length();
            String newRoomIds = roomIds.toString().substring(1, oldRoomIdsLength-1);

            MimeBodyPart textPart = new MimeBodyPart();
            String emailContent = "<div style='font-family: Arial, sans-serif; color: black;'>" +
                                  "<p><strong>Dear " + nickname + ",</strong></p>" +
                                  "<p>We're so happy you're staying with us. For quick reference, you can find your check-out details below.</p>" +
                                  "<p><strong>Room Type:</strong> " + roomIds + "</p>" +
                                  "<p><strong>Check-in time:</strong> " + checkInDate + "</p>" +
                                  "<p><strong>Check-out time:</strong> " + checkOutDate + "</p>" +
                                  "<p>If you need anything else, feel free to contact us.</p>" +
                                  "<p>Kind regards,</p>" + 
                                  "<br><img src='cid:logo' width='500' height='88'>" +
                                  "</div>";
            textPart.setContent(emailContent, "text/html");

            // Create the image
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("logo.png"); // Replace with the path to your image
            imagePart.setDataHandler(new DataHandler(source));
            imagePart.setHeader("Content-ID", "<logo>");

            // Combine parts
            multipart.addBodyPart(textPart);
            multipart.addBodyPart(imagePart);
            message.setContent(multipart);

            // Send email
            Transport.send(message);
            System.out.println("Mail successfully sent");
        } catch (MessagingException mex) {
            mex.printStackTrace();
        }
    }
}