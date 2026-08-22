const { AsyncLocalStorage } = require("async_hooks");

const asyncLocalStorage = new AsyncLocalStorage();

function createContext(data) {
  return data;
}

function getContext() {
  return asyncLocalStorage.getStore() || null;
}

function runWithContext(data, fn) {
  return asyncLocalStorage.run(data, fn);
}

module.exports = { createContext, getContext, runWithContext };
