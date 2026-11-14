import { Environment, validateEnv } from './env.validation';

describe('validateEnv', () => {
  const DATABASE_URL = 'postgresql://user:s3cret@localhost:5432/taskflow';

  it('applies defaults and converts PORT to a number', () => {
    expect(validateEnv({ DATABASE_URL })).toMatchObject({
      NODE_ENV: Environment.Development,
      PORT: 3000,
      DATABASE_URL,
    });
    expect(validateEnv({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails fast when DATABASE_URL is missing or not a PostgreSQL URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL must be a PostgreSQL connection string/,
    );
  });

  it('rejects invalid PORT and NODE_ENV values without echoing secret values', () => {
    const run = (): unknown =>
      validateEnv({ DATABASE_URL: 'mysql://user:s3cret@host/db', PORT: '70000', NODE_ENV: 'qa' });

    expect(run).toThrow(/PORT/);
    expect(run).toThrow(/NODE_ENV/);
    expect(run).not.toThrow(/s3cret/);
  });
});
