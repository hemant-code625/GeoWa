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

// There are only 3 locations: home, college, and unknown
var prevLocation = "home";

const client = twilio(accountSid, authToken);
const groupMembers = [
  "whatsapp:+917559228490",
  "whatsapp:+918080644421",
  "whatsapp:+919325212010",
];

const areas = {
  home: { lat: 19.872965191245473, lon: 75.33982995870663, radius: 50 },
  college: { lat: 19.879957240615607, lon: 75.3568617444232, radius: 100 },
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

app.post("/location", (req, res) => {
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
    groupMembers.forEach((number) => {
      client.messages
        .create({
          body: "Hemant reached college 🏫",
          from: `whatsapp:+${process.env.TWILIO_NUMBER}`,
          to: number,
        })
        .then((message) =>
          console.log(`Message sent to ${number}: ${message.body}`)
        )
        .catch((err) =>
          console.error(`Error sending message to ${number}:`, err)
        );
    });
    prevLocation = "college";
    statusMessage = "Hemant reached college 🏫";
  } else if (location === "home" && prevLocation === "college") {
    groupMembers.forEach((number) => {
      client.messages
        .create({
          body: "Hemant reached home 🏠",
          from: `whatsapp:+${process.env.TWILIO_NUMBER}`,
          to: number,
        })
        .then((message) =>
          console.log(`Message sent to ${number}: ${message.body}`)
        )
        .catch((err) =>
          console.error(`Error sending message to ${number}:`, err)
        );
    });
    prevLocation = "home";
    statusMessage = "Hemant reached home 🏠";
  }

  if (statusMessage) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          statusMessage,
          { currLocation: location },
          { prevLocation }
        )
      );
  } else {
    return res.status(200).json(
      new ApiResponse(
        200,
        "No status update",
        {
          currLocation: null,
        },
        {
          prevLocation,
        }
      )
    );
  }
});

app.get("/", (req, res) => {
  res.send("Hello from geo-wa server!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
