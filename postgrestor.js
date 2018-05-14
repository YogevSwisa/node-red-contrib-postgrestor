module.exports = function(RED) {
  'use strict';
  const mustache = require('mustache');
  const Pool = require('pg').Pool;

  function PostgresDBNode(n) {
    const node = this;
    const _getField = (kind, value) => {
      switch (kind) {
        case 'flow': {
          return node.context().flow.get(value);
          break;
        }
        case 'global': {
          return node.context().global.get(value);
          break;
        }
        case 'num': {
          return parseInt(value);
          break;
        }
        case 'bool': {
          return JSON.parse(value);
          break;
        }
        default: {
          return value;
          break;
        }
      }
    };
    RED.nodes.createNode(node, n);
    node.name = n.name;
    node.host = _getField(n.hostFieldType, n.host);
    node.hostFieldType = n.hostFieldType;
    node.port = _getField(n.portFieldType, n.port);
    node.portFieldType = n.portFieldType;
    node.database = _getField( n.databaseFieldType, n.database);
    node.databaseFieldType = n.databaseFieldType;
    node.ssl = _getField(n.sslFieldType, n.ssl);
    node.sslFieldType = n.sslFieldType;
    node.max = _getField(n.maxFieldType, n.max);
    node.maxFieldType = n.maxFieldType;
    node.min = _getField(n.minFieldType, n.min);
    node.minFieldType = n.minFieldType;
    node.idle = _getField( n.idleFieldType, n.idle);
    node.idleFieldType = n.idleFieldType;
    // Check credentials
    if (node.credentials) {
      node.user = _getField(n.userFieldType, node.credentials.user);
      node.userFieldType = n.userFieldType;
      node.password = _getField(n.passwordFieldType, node.credentials.password);
      node.passwordFieldType = n.passwordFieldType;
    }
  }

  RED.nodes.registerType('postgresDB', PostgresDBNode, {
    credentials: {
      user: {type: 'text'},
      password: {type: 'text'}
    }
  });

  function PostgrestorNode(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.topic = config.topic;
    node.config = RED.nodes.getNode(config.postgresDB);
    node.on('input', (msg) => {
      const query = mustache.render(config.query, {msg});
      const pool = new Pool({
        user: node.config.user,
        password: node.config.password,
        host: node.config.host,
        port: node.config.port,
        database: node.config.database,
        ssl: node.config.ssl,
        max: node.config.max,
        min: node.config.min,
        idleTimeoutMillis: node.config.idle
      });
      const asyncQuery = async () => {
        let client = false;
        try {
          client = await pool.connect();
          msg.payload = await client.query(query);
        } catch (error) {
          node.error(error);
          msg.err = error;
        } finally {
          node.send(msg);
          client && client.release();
          await pool.end()
        }
      };
      asyncQuery();
    });
    node.on('close', () => node.status({}));
  }

  RED.nodes.registerType('postgrestor', PostgrestorNode);
};
