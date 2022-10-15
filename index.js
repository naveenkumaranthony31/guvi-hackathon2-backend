const express = require("express");
const app = express();
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const dotenv = require("dotenv").config();

const cors = require("cors");
var nodemailer = require("nodemailer");

const URL = process.env.DB;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//MiddleWare
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials:true
  })
);
app.get("/",(req,res)=>res.send('Server Running'));
let authenticate = function (request, response, next) {
  console.log(request.headers);
  if (request.headers.authorization) {
    let verify = jwt.verify(
      request.headers.authorization,
      process.env.SECRET 
    );
    console.log(verify);
    if (verify) {
      request.userid = verify.id;

      next();
    } else {
      response.status(401).json({
        message: "Unauthorized",
      });
    }
  } else {
    response.status(401).json({
      message: "Unauthorized",
    });
  }
};

let authenticateUser = function (request, response, next) {
  // console.log(request.headers);
  if (request.headers.authorization) {
    let verify = jwt.verify(
      request.headers.authorization,
      process.env.SECRET 
    );
    console.log(verify);
    if (verify) {
      request.userid = verify.id;
      console.log(request.role);
      if (verify.role === "User") {
        next();
      } else {
        response.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      response.status(401).json({
        message: "Unauthorized",
      });
    }
  } else {
    response.status(401).json({
      message: "Unauthorized",
    });
  }
};
let authenticateAdmin = function (request, response, next) {
  // console.log(request.headers);
  if (request.headers.authorization) {
    let verify = jwt.verify(
      request.headers.authorization,
      process.env.SECRET 
    );
    console.log(verify);
    if (verify) {
      request.userid = verify.id;
      console.log(request.role);
      if (verify.role === "Admin") {
        next();
      } else {
        response.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      response.status(401).json({
        message: "Unauthorized",
      });
    }
  } else {
    response.status(401).json({
      message: "Unauthorized",
    });
  }
};

app.post("/register", async function (request, response) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow"); 
    const salt = await bcrypt.genSalt(10);
    //console.log(salt);
     const hash = await bcrypt.hash(request.body.password, salt);
     request.body.password = hash;
    await db.collection("users").insertOne(request.body);
    await connection.close();
    response.json({
      message: "User Registered!",
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/", async function (request, response) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow");
    const user = await db
      .collection("users")
      .findOne({ username: request.body.username });

    if (user) {
      const match = await bcrypt.compare(request.body.password, user.password);
      //console.log(match)
      if (match) {
        //Token
        const token = jwt.sign(
          { id: user._id, username: user.username, role: user.role },
         process.env.SECRET
        );
        //  
        console.log(token);
        response.json({
          message: "Successfully Logged In!!",
          token,
        });
      } else {
        response.json({
          message: "Password is incorrect!!",
        });
      }
    } else {
      response.json({
        message: "User not found",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/admin-dashboard", authenticate, async function (request, response) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow");
    request.body.userid = mongodb.ObjectId(request.userid);
    await db.collection("movies").insertOne(request.body);
    await connection.close();
    response.json({
      message: "Movie Added!!",
    });
  } catch (error) {
    console.log(error);
  }
});

app.get(
  "/admin-dashboard",
  authenticateAdmin,
  async function (request, response) {
    try {
      const connection = await mongoClient.connect(URL);
      const db = connection.db("bookMyShow");
      let movies = await db
        .collection("movies")
        .find({ userid: mongodb.ObjectId(request.userid) })
        .toArray();
      //   .find({ userid: mongodb.ObjectId(request.userid) })

      await connection.close();
      response.json(movies);
    } catch (error) {
      console.log(error);
    }
  }
);
app.get("/dashboard", authenticateUser, async function (request, response) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow");
    let movies = await db.collection("movies").find().toArray();
    //   .find({ userid: mongodb.ObjectId(request.userid) })
    //   .toArray();
    await connection.close();
    response.json(movies);
  } catch (error) {
    console.log(error);
  }
});
app.get("/admin-dashboard/:id", authenticateAdmin, async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow");
    let movie = await db
      .collection("movies")
      .findOne({ _id: mongodb.ObjectId(req.params.id) });

    //Close the connection
    await connection.close();

    res.json(movie);
  } catch (error) {
    console.log(error);
  }
});
app.put("/admin-dashboard/:id",  async function (req, res) {
  try {
    const connection = await mongoClient.connect(URL);
    const db = connection.db("bookMyShow");
    await db
      .collection("movies")
      .updateOne({ _id: mongodb.ObjectId(req.params.id) }, { $set: req.body });
    await connection.close();
    res.json({ message: "Edited Successfully!!" });
  } catch (error) {
    console.log(error);
  }
});
app.delete(
  "/admin-dashboard/:id",
  
  async function (req, res) {
    try {
      const connection = await mongoClient.connect(URL);
      const db = connection.db("bookMyShow");
      await db
        .collection("movies")
        .deleteOne({ _id: mongodb.ObjectId(req.params.id) });
      await connection.close();
      res.json({ message: "Deleted Successfully!!" });
    } catch (error) {
      console.log(error);
    }
  }
);

app.post(
  "/ticket/:movie/:selected/:totalprice",
  authenticateUser,
  async function (request, response) {
    try {
      let mailid = request.body.email;

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "testnodemail04@gmail.com",
          pass:  process.env.pass,
        },
      });
console.log(request.params.movie , request.params.selected , request.params.totalprice)
      var mailOptions = {
        from: "testnodemail04@gmail.com",
        to: mailid,
        subject: "BookMyShow",
        text: `Your Ticket`,
        html: `<div><h3>Book My Show</h3><h5>${request.params.movie}</h5><p>${request.params.selected}</p><small>₹${request.params.totalprice}</small></div>`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
          response.json({
            message:'Email not send'
          })
        } else {
          console.log("Email sent: " + info.response);
          response.json({
            message:'Email Send'
          })
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
);
//Port
app.listen(process.env.PORT || 3001);
