import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendEmail } from './email';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendEmail', () => {
  it('POSTs to the Resend API with the expected shape', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'test' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await sendEmail('test-key', { to: 'someone@example.com', subject: 'Test', html: '<p>hi</p>' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(['someone@example.com']);
    expect(body.subject).toBe('Test');
    expect(body.html).toBe('<p>hi</p>');
    expect(body.from).toContain('mail.scattered-oaks-zebu.com');
  });

  it('logs and does not throw on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad request', { status: 400 })));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendEmail('test-key', { to: 'someone@example.com', subject: 'Test', html: '<p>hi</p>' }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs and does not throw when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendEmail('test-key', { to: 'someone@example.com', subject: 'Test', html: '<p>hi</p>' }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs and does not throw when fetch rejects with a non-Error value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('connection reset'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendEmail('test-key', { to: 'someone@example.com', subject: 'Test', html: '<p>hi</p>' }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('connection reset'));
  });
});
