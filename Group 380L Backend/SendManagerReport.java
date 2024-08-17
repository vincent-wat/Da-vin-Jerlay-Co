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
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.PriorityQueue;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.lang.StringBuilder;

public class SendManagerReport {

    public static List<String> insertionSort(List<String> list) {
        for (int i = 1; i < list.size(); i++) {
            String key = list.get(i);
            int j = i - 1;

            while (j >= 0 && list.get(j).compareTo(key) > 0) {
                list.set(j + 1, list.get(j));
                j = j - 1;
            }
            list.set(j + 1, key);
        }
        return list;
    }

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
        double avgDays = 0.0;
        int numOfBookings = 0;
        List<String> customerNames = new ArrayList<>();

        Map<String, Integer> roomTypeCounts = new HashMap<>();
        String[] roomTypes = {"1bed", "2bed", "3bed", "4bed", "suite", "deluxe"};
         for (String roomType : roomTypes) {
             roomTypeCounts.put(roomType.toLowerCase(), 0);
         }

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

            // Query for room type
            String roomsSQL = "SELECT room_type FROM bookings WHERE status = 'active'";
            PreparedStatement roomStatement = connection.prepareStatement(roomsSQL);
            ResultSet roomResultSet = roomStatement.executeQuery();

            while (roomResultSet.next()) {
                String roomType = roomResultSet.getString("room_type").toLowerCase();;
                
                 // Increment
                 if (roomTypeCounts.containsKey(roomType)) {
                    roomTypeCounts.put(roomType, roomTypeCounts.get(roomType) + 1);
                }
            }

            PriorityQueue<Entry<String, Integer>> heap = new PriorityQueue<>(new Comparator<Entry<String, Integer>>() {
                @Override
                public int compare(Entry<String, Integer> i, Entry<String, Integer> j) {
                    return j.getValue().compareTo(i.getValue());
                }
            });

            heap.addAll(roomTypeCounts.entrySet());

            //Most Booked room
            Entry<String, Integer> mostBookedRoom = heap.poll();

             // Query for customer names
             String customerSql = "SELECT user_name FROM bookings WHERE status = 'active'";
             PreparedStatement customerStatement = connection.prepareStatement(customerSql);
             ResultSet customerResultSet = customerStatement.executeQuery();
 
             // Retrieve customer names
             while (customerResultSet.next()) {
                String userName = customerResultSet.getString("user_name");
                if (userName != null) {
                    customerNames.add(userName);
                }
            }
 
             // Sort the customer names
             List<String> sortedCustomerNames = insertionSort(customerNames);

            bookingResultSet.close();
            bookingStatement.close();
            roomResultSet.close();
            roomStatement.close();
            connection.close();

            // Construct the email message
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(sender));
            message.addRecipient(Message.RecipientType.TO, new InternetAddress("davinjerlay@gmail.com"));
            message.setSubject("Manager Report");

            //StringBuilder for list of customer names

            StringBuilder sb = new StringBuilder();

            for (String name : sortedCustomerNames) {
                sb.append("<li>").append(name).append("</li>");
            }

            String listOfCustNames = sb.toString();

            // HTML formatted email content
            String emailContent = String.format(
                "<div style='font-family: Arial, sans-serif; color: black;'>" +
                "<p><u><strong>Manager Report:</strong></u></p>" +
                "<p><strong>Total Number of Bookings:</strong> %d</p>" +
                "<p><strong>Average Days Stayed:</strong> %.1f</p>" +
                "<p><strong><u>Room Types Booked:</u></strong></p>" +
                "<ul>" +
                "<li>1 Bed: %d</li>" +
                "<li>2 Bed: %d</li>" +
                "<li>3 Bed: %d</li>" +
                "<li>4 Bed: %d</li>" +
                "<li>Suite: %d</li>" +
                "<li>Deluxe: %d</li>" +
                "</ul>" +
                "<p><strong>Most Booked Room Type:</strong> " + mostBookedRoom.getKey() + 
                "<p><strong><u>List of Current Customer Names (Alphabetical Order):</strong></p></u>" + listOfCustNames +
                "<br><img src='cid:logo' width='500' height='88'>" +
                "</div>",
                numOfBookings, avgDays,
                roomTypeCounts.get("1bed"),
                roomTypeCounts.get("2bed"),
                roomTypeCounts.get("3bed"),
                roomTypeCounts.get("4bed"),
                roomTypeCounts.get("suite"),
                roomTypeCounts.get("deluxe")
            );

            // Create a multipart message
            Multipart multipart = new MimeMultipart();

            // Create the HTML part of the email
            MimeBodyPart htmlPart = new MimeBodyPart();
            htmlPart.setContent(emailContent, "text/html");

            // Add the HTML part to the multipart message
            multipart.addBodyPart(htmlPart);

            // Add the Da'vin Jerlay Co logo to the email
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("Group 380L Backend\\logo.png");
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
