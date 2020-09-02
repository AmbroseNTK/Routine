const admin = require("firebase-admin");
const config = require("../config");

const auth = async function (req, res, next) {
  const { authorization } = req.headers;
  if(config["auth-bypass"]===true){
    if(req.body.user === undefined){
      res.status(401).send({
        message:"Require dummy user data"
      });
      return;
    }
    req.user = req.body.user;
    next();
    return;
  }
  if (authorization === undefined) {
    res.status(401).send({ message: "Id token is required" });
    return;
  }
  try {
    let token = await admin.auth().verifyIdToken(authorization);
    req.user = token;
    next();
  } catch(e) {
    res.status(401).send({
      message: "The id token is invalid",
    });
  }
};

module.exports = auth;
