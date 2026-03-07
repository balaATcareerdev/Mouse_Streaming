import express from "express";

const app = express();
const PORT = process.env.PORT || 8002;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello Welcome to Express Server!👌");
});

app.listen(PORT, () => {
  console.log(`The Server is Active in the PORT ${PORT}`);
});
