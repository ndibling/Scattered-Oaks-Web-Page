import { env } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../index';

const ALWAYS_PASS_TOKEN = 'always-pass-dummy-token';

function post(body: unknown) {
  return worker.fetch(
    new Request('http://example.com/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/contact', () => {
  it('rejects a request missing required fields', async () => {
    const res = await post({ name: 'Alex' });
    expect(res.status).toBe(400);
  });

  it('rejects a request with no Turnstile token', async () => {
    const res = await post({ name: 'Alex', email: 'alex@example.com', message: 'Hi there' });
    expect(res.status).toBe(400);
  });

  it('rejects a failed Turnstile verification and sends no email', async () => {
    const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('siteverify')) {
        return Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 200 }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url} ${JSON.stringify(init)}`));
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await post({
      name: 'Alex',
      email: 'alex@example.com',
      message: 'Hi there',
      turnstileToken: 'bad-token',
    });
    expect(res.status).toBe(400);
    // Only the siteverify call happened — no Resend call was ever attempted.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('accepts a valid submission without an animal and emails a generic subject', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.includes('siteverify')) {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }));
      }),
    );

    const res = await post({
      name: 'Alex',
      email: 'alex@example.com',
      message: 'Just saying hi',
      turnstileToken: ALWAYS_PASS_TOKEN,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const resendCall = calls.find((c) => c.url.includes('resend.com'));
    expect(resendCall).toBeDefined();
    const body = JSON.parse(resendCall!.init!.body as string);
    expect(body.to).toEqual([env.OWNER_CONTACT_EMAIL]);
    expect(body.subject).toBe('New contact form inquiry');
    expect(body.html).toContain('Just saying hi');
  });

  it('accepts a valid submission with an animal and includes its name in the email', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.includes('siteverify')) {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ id: 'email-2' }), { status: 200 }));
      }),
    );

    const res = await post({
      name: 'Jamie',
      email: 'jamie@example.com',
      message: 'Is Daisy still available?',
      animalId: 'daisy',
      turnstileToken: ALWAYS_PASS_TOKEN,
    });
    expect(res.status).toBe(200);

    const resendCall = calls.find((c) => c.url.includes('resend.com'));
    const body = JSON.parse(resendCall!.init!.body as string);
    expect(body.subject).toBe('Inquiry about Daisy');
    expect(body.html).toContain('Daisy');
  });

  it('falls back to a generic subject for an unknown/soft-deleted animalId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('siteverify')) {
          return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ id: 'email-3' }), { status: 200 }));
      }),
    );

    const res = await post({
      name: 'Jamie',
      email: 'jamie@example.com',
      message: 'Anyone home?',
      animalId: 'not-a-real-animal-id',
      turnstileToken: ALWAYS_PASS_TOKEN,
    });
    expect(res.status).toBe(200);
  });
});
