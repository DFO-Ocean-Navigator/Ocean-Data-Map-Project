// Changes the spinning hamster to a sad computer face if this
// is a production Node.js environment.

var fail;

if (process.env.NODE_ENV == "production") {
  fail = require("../images/sad-computer.png");
} 
else {
  // We're in dev environment.
  fail = require("../images/failure.gif");
}

module.exports = fail;

