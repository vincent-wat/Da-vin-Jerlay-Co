import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

public class SendManagerReport {

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

        // Variables to store hotel information
        Room room =  null;
        int bed1 = 0;
        int bed2 = 0;
        int bed3 = 0;
        int bed4 = 0;
        int suite = 0;
        int deluxe = 0;
        double avgDays = 0.0;
        int numOfBookings = 0;

        try {
            // Database Connection
            Connection connection = DriverManager.getConnection(jdbcURL, dbUser, dbPassword);

            // Query for check-in and check-out dates
            String bookingSql = "SELECT check_in, check_out FROM bookings WHERE status = 'active'";
            PreparedStatement bookingStatement = connection.prepareStatement(bookingSql);
            ResultSet bookingResultSet = bookingStatement.executeQuery();

            LocalDate checkInDate =null;
            LocalDate checkOutDate =null;
            long totalDays = 0;
    
           
            // Iterate through the results
            while (bookingResultSet.next()) {
                 checkInDate = bookingResultSet.getDate("check_in").toLocalDate();
                 checkOutDate = bookingResultSet.getDate("check_out").toLocalDate();

                // Calculation
                long daysStayed = ChronoUnit.DAYS.between(checkInDate, checkOutDate);
                totalDays += daysStayed;
                numOfBookings++;
            }

               // Calculate the average days stayed
               if (numOfBookings > 0) {
                avgDays = (double) totalDays / numOfBookings;
               }

               avgDays = Math.round(avgDays * 10.0) / 10.0;

            // Query for room type
            String roomsSQL = "SELECT room_type FROM bookings WHERE status = 'active'";
            PreparedStatement roomStatement = connection.prepareStatement(roomsSQL);
            ResultSet roomResultSet = roomStatement.executeQuery();

            while (roomResultSet.next()) {
                String roomTypeString = roomResultSet.getString("room_type");
                RoomType roomType = RoomType.fromDatabase(roomTypeString);
                room = new Room(roomType);

                if (roomType.equals(RoomType.SINGLE)) {
                    bed1++;
                }
                else if (roomType.equals(RoomType.DOUBLE)) {
                    bed2++;
                } 
                else if (roomType.equals(RoomType.TRIPLE)) {
                    bed3++;
                } 
                else if (roomType.equals(RoomType.QUADRUPLE)) {
                    bed4++;
                } 
                else if (roomType.equals(RoomType.SUITE)) {
                    suite++;
                } 
                else if (roomType.equals(RoomType.DELUXE)) {
                    deluxe++;
                }
            }

            // Construct the email message
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(sender));
            message.addRecipient(Message.RecipientType.TO, new InternetAddress("davinjerlay@gmail.com"));
            message.setSubject("Manager Report");

            // HTML formatted email content
            String emailContent = "<div style='font-family: Arial, sans-serif; color: black;'>" +
                                  "<p><u><strong>Manager Report:</strong></u></p>" +
                                  "<p><strong>Total Number of Bookings:</strong> " + numOfBookings + "</p>" +
                                  "<p><strong>Average Days Stayed:</strong> " + avgDays + "</p>" +
                                  "<p><strong><u>Room Types Booked:</strong></u></p>" +
                                  "<ul>" +
                                  "<li>1 Bed: " + bed1 + "</li>" +
                                  "<li>2 Bed: " + bed2 + "</li>" +
                                  "<li>3 Bed: " + bed3 + "</li>" +
                                  "<li>4 Bed: " + bed4 + "</li>" +
                                  "<li>Suite: " + suite + "</li>" +
                                  "<li>Deluxe: " + deluxe + "</li>" +
                                  "</ul>" +
                                  "<br><img src='cid:logo' width='500' height='88'>" +
                                  "</div>";

            // Create a multipart message
            Multipart multipart = new MimeMultipart();

            // Create the HTML part of the email
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(emailContent, "text/html");

            // Add the HTML part to the multipart message
            multipart.addBodyPart(htmlPart);

            // Add the Da'vin Jerlay Co logo to the email
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("logo.png");
            imagePart.setDataHandler(new DataHandler(source));
            imagePart.setHeader("Content-ID", "<logo>");
            multipart.addBodyPart(imagePart);

            // Set the complete message parts
            message.setContent(multipart);

            // Send the email
            Transport.send(message);
            System.out.println("Sent message successfully.");

            // Close the database connection
            connection.close();

        } catch (MessagingException | SQLException mex) {
            mex.printStackTrace();
        }
    }
}