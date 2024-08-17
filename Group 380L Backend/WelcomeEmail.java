import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;



public class WelcomeEmail {

    /**
     * The main method that serves as the entry point of the program.
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

        // Set properties for the email session
        Properties properties = System.getProperties();
        properties.setProperty("mail.smtp.host", host);
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.port", "587");
        properties.put("mail.smtp.starttls.enable", "true");
        properties.put("mail.smtp.ssl.trust", "smtp.gmail.com");

        // Retrieve properties and create a mail session
        Session session = Session.getInstance(properties, new Authenticator() {
            /**
             * Authenticates the email session using the provided credentials.
             *
             * @return PasswordAuthentication containing the email and password.
             */
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication("davinjerlay@gmail.com", "upli vydd cndj fuoq");
            }
        });

        // TODO: Currently hardcoded, needs to match the user ordering
        int userId = 15;

        // Variables to store user information
        String recipientEmail = null;
        String nickname = null;

        // Database connection and user info retrieval
        try {
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            // Query to get the user's email by user ID
            String sql = "SELECT email FROM users WHERE id = ?";
            PreparedStatement preparedStatement = connection.prepareStatement(sql);
            preparedStatement.setInt(1, userId);
            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {
                recipientEmail = resultSet.getString("email");
            }

            // Query to get the user's nickname by user ID
            String nicknameSql = "SELECT nickname FROM users WHERE id = ?";
            PreparedStatement nicknameStatement = connection.prepareStatement(nicknameSql);
            nicknameStatement.setInt(1, userId);
            ResultSet nicknameResultSet = nicknameStatement.executeQuery();

            if (nicknameResultSet.next()) {
                nickname = nicknameResultSet.getString("nickname");
            }

            // Close database resources
            nicknameResultSet.close();
            nicknameStatement.close();
            connection.close();

        } catch (SQLException e) {
            e.printStackTrace();
        }

        // Email sending process
        try {
            MimeMessage message = new MimeMessage(session);

            // Set the sender's email
            message.setFrom(new InternetAddress(sender));

            // Set the recipient's email
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(recipientEmail));

            // Set the subject of the email
            message.setSubject("Da' Vin Jerlay Co. Account Verification");

            // Multipart for combining text and image
            Multipart multipart = new MimeMultipart();

            // Create the body part for the text
            MimeBodyPart textPart = new MimeBodyPart();
            String verificationLink = "http://localhost:3000/";
            String emailContent = "<div style='font-family: Arial, sans-serif; color: black; text-align: center;'>" +
                                  "<br><a href='" + verificationLink + "'><img src='cid:smalllogo' width='100' height='97'></a>" +
                                  "<p><strong>Hello " + nickname + ", </strong></p>" +
                                  "<p><strong>You've received this message because your email was used to register an account with Da' Vin Jerlay Co.</strong></p>" +
                                  "<p><strong>Please verify your account by clicking on the turtle.</strong></p>" +
                                  "<p><strong>Thank you, </strong></p>" +
                                  "<p><strong>The Da' Vin Jerlay Team</strong></p>" +
                                  "</div>";
            textPart.setContent(emailContent, "text/html");

            // Create the body part for the image
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("smalllogo.png");
            imagePart.setDataHandler(new DataHandler(source));
            imagePart.setHeader("Content-ID", "<smalllogo>");

            // Combine the text and image parts
            multipart.addBodyPart(textPart);
            multipart.addBodyPart(imagePart);

            // Set the content of the message to the multipart
            message.setContent(multipart);

            // Send the email
            Transport.send(message);
            System.out.println("Mail successfully sent");
        } catch (MessagingException mex) {
            mex.printStackTrace();
        }
    }
}
