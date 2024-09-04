const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
dotenv.config();

var status = "home";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

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
  const { lat, lon } = req.body;
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
  // if location is college and status is home and time is between 10am to 5pm => send message 'Hemant reached college'
  // if location is home and status is college and time is between 10am to 11pm => send message 'Hemant reached home'
  // if location is college and status is college => do nothing
  // if location is home and status is home => do nothing

  if (location === "college" && status === "home") {
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
    status = "college";
  } else if (location === "home" && status === "college") {
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
    status = "home";
    res.send(`Location: ${location}`);
  }
});

app.get("/", (req, res) => {
  res.send("Hello from geo-wa server!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
