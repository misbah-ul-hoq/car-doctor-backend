const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
app.use(
  cors({
    origin: ["https://fir-caaac.web.app", "https://fir-caaac.firebaseapp.com"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 3000;

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res
      .status(401)
      .send({ message: "Token not found, unauthorized access" });
  }
  jwt.verify(token, process.env.TOKEN, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: "Unauthorized token" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustercardoctor.avphfsl.mongodb.net/?retryWrites=true&w=majority&appName=clusterCarDoctor`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    const services = client.db("carDoctorDB").collection("services");

    app.get("/services", verifyToken, async (req, res) => {
      const query = req.query;

      // console.log("user after validation", req.user);
      if (req.query?.email !== req.user?.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const allServices = await services.find(query).toArray();

      res.send(allServices);
    });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN, { expiresIn: "1h" });
      console.log("created token for the user", user);
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("loging out user", user);
      res.clearCookie("token").send({ success: true });
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { price: 1 },
      };
      const result = await services.findOne(query, options);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server is running");
});

app.get("/lol", (req, res) => {
  res.send("you are on the lol route. does it work or not?");
});

app.listen(port, () => {
  console.log(`Server started at  http://localhost:${port}`);
});
