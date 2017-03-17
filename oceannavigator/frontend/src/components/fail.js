var fail;

if (process.env.NODE_ENV == "production") {
  fail = require("../images/sad-computer.png");
} else {
  fail = require("../images/failure.gif");
}

module.exports = fail;

