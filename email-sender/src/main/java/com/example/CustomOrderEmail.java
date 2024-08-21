package com.example;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;
import javax.mail.*;
import javax.mail.internet.*;
import javax.activation.*;

public class CustomOrderEmail {
    public static void main(String[] args) {
        // Log the received user ID
        int userId = Integer.parseInt(args[0]);
        System.out.println("Received user ID: " + userId);

        // Database Setup
        String jdbcURL = "jdbc:mysql://localhost:3306/hotel_db";
        String dbUser = "root";
        String dbPassword = "";

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
                return new PasswordAuthentication("davinjerlay@gmail.com", "uplivyddcndjfuoq");
            }
        });

        // Database Connection + User Info Queries
        String recipientEmail = null;
        String nickname = null;

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

            nicknameResultSet.close();
            nicknameStatement.close();
            connection.close();

            // Log recipient details
            System.out.println("Recipient email: " + recipientEmail);
            System.out.println("Recipient nickname: " + nickname);

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
            message.setSubject("Da' Vin Jerlay Co. Account Verification");

            // Multipart for body/image separation
            Multipart multipart = new MimeMultipart();

            // Create the body
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

            // Create the image
            MimeBodyPart imagePart = new MimeBodyPart();
            DataSource source = new FileDataSource("/Users/slaya/Desktop/EmailJar/email-sender/smalllogo.png"); // Use the absolute path
            imagePart.setDataHandler(new DataHandler(source));
            imagePart.setHeader("Content-ID", "<smalllogo>");

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
