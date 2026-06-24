export * from './types';
export * from './registry';
export { bigmodelAdapter } from './adapters/bigmodel';
export { volcengineAgentplanAdapter } from './adapters/volcengine-agentplan';
export { volcengineCodingplanAdapter } from './adapters/volcengine-codingplan';

import { registerPlatform } from './registry';
import { bigmodelAdapter } from './adapters/bigmodel';
import { volcengineAgentplanAdapter } from './adapters/volcengine-agentplan';
import { volcengineCodingplanAdapter } from './adapters/volcengine-codingplan';

registerPlatform(bigmodelAdapter);
registerPlatform(volcengineAgentplanAdapter);
registerPlatform(volcengineCodingplanAdapter);
