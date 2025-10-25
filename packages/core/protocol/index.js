/**
 * @fileoverview MCP Protocol Module Exports
 */

const IMCPProtocol = require('./mcp-protocol');
const { MCPProtocolV1, PHASES } = require('./mcp-v1-simple');

module.exports = {
  IMCPProtocol,
  MCPProtocolV1,
  PHASES
};
