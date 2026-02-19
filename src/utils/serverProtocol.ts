export type ParsedCommand = {
  command: string;
  key?: string;
  value?: string;
  ttl?: string;
};

const TOKEN_PATTERN =
  /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\s]+)/g;

function stripAndUnescape(token: string): string {
  if (token.length < 2) {
    return token;
  }

  const quote = token[0];
  if ((quote !== '"' && quote !== "'") || token[token.length - 1] !== quote) {
    return token;
  }

  const body = token.slice(1, -1);
  return body.replace(/\\(["'\\])/g, "$1");
}

function tokenize(line: string): string[] {
  const matches = line.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }
  return matches.map((token) => stripAndUnescape(token));
}

export function parseCommand(line: string): ParsedCommand | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return null;
  }

  const [commandRaw, key, value, ttl] = tokens;
  return {
    command: commandRaw.toUpperCase(),
    key,
    value,
    ttl,
  };
}
