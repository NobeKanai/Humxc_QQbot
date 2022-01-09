"use strict";
const { client } = require("./client");

module.exports = {
  clients: [],
  getClient: (qq) => {
    this.clients.forEach((clirnt) => {
      if (client.account == qq) return client;
    });
  },
};
