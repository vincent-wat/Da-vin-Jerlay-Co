import java.text.SimpleDateFormat;
import java.util.Date;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

/**
 * Class Name: EventTickets
 * Date: August 14, 2024
 * Programmer: Gerardo and Vincent
 * 
 * Brief Description:
 * 
 * The `EventTickets` class is used for sending event reservations to the hotel guest. 
 * It connects to the MySQL database and gets the information from the guest and event.
 * It then uses javamail to send an email to the guest.
 * 
 * Brief Explanation of Important functions:
 * 
 * - `main(String[] args)`: Connects to the database, retrieves user/event information, and sends an email with the event details.
 * 
 *  - Output: Sends an email to the user and prints "Mail successfully sent" if successful.
 * 
 * Any important data structure in class/methods
 * 
 * - Database connection: The class uses JDBC to connect to a MySQL database.
 * - Email session: The class sets up a session with Gmail SMTP server using JavaMail API.
 * 
 * 
 * Briefly describe any algorithm that you may have used and why did you select it upon other algorithms where more than one option exists.
 * 
 *   Database queries: The class executes SQL queries to retrieve user email, nickname, and 
 *      event information. The SQL queries ensure that only relevant data is fetched based on the user ID.
 * - Email composition: The class uses JavaMail API to compose and send an HTML email with an embedded image.
 *      This approach was selected to ensure the email content is well-formatted and visually appealing.
 */
public class EventTickets {

    /**
     * The main method is the entry point of the application. It sets up the database connection,
     * retrieves user and event information, and sends an email confirmation to the user.
     *
     * @param args Command-line arguments (not used).
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
                return new PasswordAuthentication("davinjerlay@gmail.com", "upli vydd cndj fuoq");
            }
        });

        // TODO: Currently hardcoded, needs to match the user ordering
        int userId = 2;

        // Database Connection + User Info Queries
        String recipientEmail = null;
        String nickname = null;
        String eventName = null;
        Date eventDate = null;
        
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

            // Query for event name at customer user ID
            String eventNameSql = "SELECT e.name FROM eventtickethistory r JOIN events_new e ON r.event_id = e.id WHERE r.user_id = ?";
            PreparedStatement eventNameStatement = connection.prepareStatement(eventNameSql);
            eventNameStatement.setInt(1, userId);
            ResultSet eventNameResultSet = eventNameStatement.executeQuery();

            if (eventNameResultSet.next()) {
                eventName = eventNameResultSet.getString("name");
            }

            // Query for event date at customer user ID
            String eventDateSql = "SELECT e.event_date FROM eventtickethistory r JOIN events_new e ON r.event_id = e.id WHERE r.user_id = ?";
            PreparedStatement eventDateStatement = connection.prepareStatement(eventDateSql);
            eventDateStatement.setInt(1, userId);
            ResultSet eventDateResultSet = eventDateStatement.executeQuery();

            if (eventDateResultSet.next()) {
                eventDate = eventDateResultSet.getDate("event_date");
            }

            String eventDateString = null;
            if (eventDate != null) {
                SimpleDateFormat sdf = new SimpleDateFormat("MM/dd/yyyy");
                eventDateString = sdf.format(eventDate);
            }
            
            connection.close();

            // Email sending
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
                MimeBodyPart textPart = new MimeBodyPart();
                String emailContent = "<div style='font-family: Arial, sans-serif; color: black;'>" +
                                      "<p><strong>Hello " + nickname + ",</strong></p>" +
                                      "<p>Thank you for booking a ticket to the <strong>" + eventName + "</strong> event. </p>" +
                                      "<p> Please remember this event will take place on this date: <strong>" + eventDateString + "</strong></p>" +
                                      "<p>If there are any issues, please let us know.</p>" +
                                      "<p>Kind regards,</p>" + 
                                      "<br><img src='cid:logo' width='400' height='70'>" +
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
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
