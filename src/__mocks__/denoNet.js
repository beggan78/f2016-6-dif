const net = require('node:net');

module.exports = {
  isIPv4: net.isIPv4,
  isIPv6: net.isIPv6
};
