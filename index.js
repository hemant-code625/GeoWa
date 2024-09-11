import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import twilio from "twilio";
import ApiResponse from "./utils/ApiResponse.js";
const app = express();
app.use(cors("*"));
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true,
//   })
// );
app.use(bodyParser.json());
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;

// There are only 2 prev locations: home and college
var prevLocation = "home";

const client = twilio(accountSid, authToken);
const groupMembers = [
  "whatsapp:+917559228490",
  "whatsapp:+918080644421",
  "whatsapp:+919325212010",
];

const areas = {
  home: { lat: 19.872955486892238, lon: 75.33972991398547, radius: 80 },
  college: { lat: 19.879700301635086, lon: 75.35650120324422, radius: 120 },
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
// Function to retry WhatsApp message with interval-based retry mechanism
const sendWhatsAppMessageWithRetry = async (
  body,
  number,
  interval = 30000,
  maxDuration = 300000
) => {
  let success = false;
  let startTime = Date.now();

  const attemptToSendMessage = async () => {
    try {
      const message = await client.messages.create({
        body,
        from: `whatsapp:+${process.env.TWILIO_NUMBER}`,
        to: number,
      });
      console.log(`Message sent to ${number}: ${message.body}`);
      success = true; // Mark success when the message is sent
    } catch (error) {
      console.error(`Error sending message to ${number}:`, error);
      if (Date.now() - startTime < maxDuration && !success) {
        console.log(
          `Retrying to send message to ${number} in ${
            interval / 1000
          } seconds...`
        );
        setTimeout(attemptToSendMessage, interval); // Retry after the defined interval
      } else {
        console.log(
          `Failed to send message to ${number} after ${
            maxDuration / 1000
          } seconds`
        );
      }
    }
  };

  attemptToSendMessage(); // Start the first attempt
};

app.post("/location", async (req, res) => {
  var { lat, lon } = req.body;
  console.log(`${lat}, ${lon}, ${prevLocation}`);

  if (!lat || !lon) {
    return res.status(400).send("Invalid data");
  }

  let location = "Unknown";
  for (const [areaName, area] of Object.entries(areas)) {
    const distance = haversineDistance(lat, lon, area.lat, area.lon);
    if (distance <= area.radius) {
      location = areaName;
      break;
    }
  }

  let statusMessage = "";

  if (location === "college" && prevLocation === "home") {
    for (const number of groupMembers) {
      // Retry every 30 seconds, with a maximum retry duration of 5 minutes (300000 ms)
      sendWhatsAppMessageWithRetry("Hemant reached college 🏫", number);
    }
    prevLocation = "college";
    statusMessage = "Hemant reached college 🏫";
  } else if (location === "home" && prevLocation === "college") {
    for (const number of groupMembers) {
      // Retry every 30 seconds, with a maximum retry duration of 5 minutes (300000 ms)
      sendWhatsAppMessageWithRetry("Hemant reached home 🏠", number);
    }
    prevLocation = "home";
    statusMessage = "Hemant reached home 🏠";
  }

  if (statusMessage) {
    return res.status(200).json(
      new ApiResponse(200, statusMessage, {
        currLocation: location,
        prevLocation,
      })
    );
  } else {
    return res.status(200).json(
      new ApiResponse(200, "No status update", {
        currLocation: location,
        prevLocation,
      })
    );
  }
});

app.get("/", (req, res) => {
  res.send("Hello from geo-wa server!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
