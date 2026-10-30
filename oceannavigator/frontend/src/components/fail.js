// Changes the spinning hamster to a sad computer face if this
// is a production Node.js environment.

var fail;

fail = "../images/sad-computer.png";
// if (process.env.NODE_ENV == "production") {
//   fail = require("../images/sad-computer.png").default;
// }
// else {
//   // We're in dev environment.
//   fail = require("../images/failure.gif").default;
// }

module.exports = fail;
